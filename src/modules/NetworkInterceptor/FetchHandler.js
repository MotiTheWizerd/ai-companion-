import { ProviderRegistry } from '../providers/ProviderRegistry.js';
import { eventBus } from '../../content/core/eventBus.js';
import { EVENTS } from '../../content/core/constants.js';

/**
 * FetchHandler - Handles fetch interception and stream processing
 */
export class FetchHandler {
  constructor(chunkProcessor) {
    this.chunkProcessor = chunkProcessor;
    this.originalFetch = window.fetch;
    this.providerRegistry = ProviderRegistry.getInstance();
  }

  /**
   * Intercept window.fetch
   */
  interceptFetch() {
    const self = this;

    window.fetch = async function (...args) {
      const [url, options] = args;

      // Check if ANY provider matches this URL
      const activeProvider = self.providerRegistry.getActiveProvider();
      const isConversationEndpoint = activeProvider && activeProvider.getURLMatcher().isConversationEndpoint(url);

      // Extract user prompt and conversation ID from request
      let userPrompt = null;
      let conversationId = null;

      if (isConversationEndpoint) {
        // Extract conversation ID from URL
        // Format: /chat_conversations/{uuid}/completion
        const conversationMatch = url.match(/chat_conversations\/([^\/]+)/);
        if (conversationMatch) {
          conversationId = conversationMatch[1];
        }

        // Extract and modify user prompt from request body
        if (options?.body) {
          try {
            console.log('[FetchHandler] Parsing request body...');
            let requestBody = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;

            // Allow provider to modify the request body (include conversation context)
            if (activeProvider && typeof activeProvider.handleRequest === 'function') {
              // Try to derive conversation ID from request body if URL didn't have it
              const bodyConversationId = requestBody?.conversation_id || requestBody?.conversationId;
              if (!conversationId && bodyConversationId) {
                conversationId = bodyConversationId;
              }

              console.log('[FetchHandler] Calling handleRequest...');
              requestBody = await activeProvider.handleRequest(requestBody, {
                conversationId,
              });
              console.log('[FetchHandler] handleRequest completed');

              // Update the request body in options
              // We need to re-stringify if it was a string originally
              if (typeof options.body === 'string') {
                options.body = JSON.stringify(requestBody);
                console.log('[FetchHandler] Updated request body (stringified)');
              } else {
                options.body = requestBody;
                console.log('[FetchHandler] Updated request body (object)');
              }
            }

            // Extract prompt for local processing (after modification)
            if (activeProvider && typeof activeProvider.extractPrompt === 'function') {
              userPrompt = activeProvider.extractPrompt(requestBody);
            } else {
              userPrompt = requestBody.prompt || null;
            }

          } catch (error) {
            console.warn('[FetchHandler] Failed to parse/modify request body:', error);
          }
        }
      }

      // Check if this is a Claude conversation retrieval API request
      // More generic pattern to catch any Claude API call that might contain conversation data
      const isClaudeConversationRetrieval = typeof url === 'string' &&
                                           url.includes('claude.ai/api/') &&
                                           (url.includes('/chat_conversations/') || url.includes('/conversations/')) &&
                                           !url.includes('/completion') &&
                                           !url.includes('/stream');

      // More specific pattern for Claude conversation details API
      const isClaudeConversationDetails = typeof url === 'string' &&
                                         url.includes('claude.ai/api/') &&
                                         url.includes('/chat_conversations/') &&
                                         url.includes('tree=True') &&
                                         url.includes('rendering_mode=messages');

      // Use the more specific pattern for conversation retrieval
      const shouldIntercept = isClaudeConversationRetrieval || isClaudeConversationDetails;

      // Debug logging for Claude API detection
      if (typeof url === 'string' && url.includes('claude.ai')) {
        console.log(`[FetchHandler] Detected Claude-related URL: ${url}`);
        console.log(`[FetchHandler]   - Is basic retrieval: ${isClaudeConversationRetrieval}`);
        console.log(`[FetchHandler]   - Is details retrieval: ${isClaudeConversationDetails}`);
        console.log(`[FetchHandler]   - Should intercept: ${shouldIntercept}`);

        // Extra logging if this is an API call but not matching our patterns
        if (url.includes('/api/') && !shouldIntercept) {
          console.log(`[FetchHandler]   - This is a Claude API call but doesn't match our interception patterns`);
          console.log(`[FetchHandler]   - Expected patterns: contains /chat_conversations/ or /conversations/, with tree=True and rendering_mode=messages, but not /completion/ or /stream/`);
        }
      }

      // Call original fetch
      const response = await self.originalFetch.apply(this, args);

      // If this was a conversation retrieval request, intercept the response
      if (shouldIntercept) {
        console.log(`[FetchHandler] Processing Claude conversation retrieval for URL: ${url}`);
        return self.handleClaudeConversationRetrieval(response, url);
      }

      if (isConversationEndpoint) {
        return self.handleConversationStream(response, activeProvider, userPrompt, conversationId);
      }

      return response;
    };
  }

  /**
   * Handle conversation stream response
   */
  async handleConversationStream(response, provider, userPrompt, conversationId) {
    const originalBody = response.body;
    if (!originalBody) return response;

    const reader = originalBody.getReader();
    const decoder = new TextDecoder();

    // Emit user message before processing stream (if we have it)
    if (userPrompt) {
      this.chunkProcessor.processUserMessage(userPrompt, conversationId, provider);
    }

    // Create a new readable stream that we can tap into
    const stream = new ReadableStream({
      start: async (controller) => {
        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              controller.close();
              break;
            }

            // Decode and process the chunk
            const chunk = decoder.decode(value, { stream: true });
            // Pass provider to chunk processor
            this.chunkProcessor.processChunk(chunk, provider);

            // Pass through to original consumer
            controller.enqueue(value);
          }
        } catch (error) {
          console.error('[FetchHandler] Stream error:', error);
          controller.error(error);
        }
      }
    });

    // Return a new response with our tapped stream
    return new Response(stream, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  }

  /**
   * Handle Claude conversation retrieval response
   * This intercepts API responses that contain full conversation data
   */
  async handleClaudeConversationRetrieval(response, url) {
    // Clone the response to read its body
    const responseClone = response.clone();

    try {
      // Check if the response is JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await responseClone.json();

        console.log('[FetchHandler] Intercepted Claude conversation data:', data);

        // Emit an event with the conversation data
        eventBus.emit(EVENTS.CLAUDE_API_RESPONSE, {
          responseData: data,
          apiUrl: url,
          timestamp: new Date().toISOString()
        });

        console.log('[FetchHandler] Emitted CLAUDE_API_RESPONSE event');
      }
    } catch (error) {
      console.warn('[FetchHandler] Could not parse Claude conversation response as JSON:', error);
    }

    // Return the original response unchanged
    return response;
  }

  /**
   * Restore original fetch
   */
  restore() {
    window.fetch = this.originalFetch;
  }
}
