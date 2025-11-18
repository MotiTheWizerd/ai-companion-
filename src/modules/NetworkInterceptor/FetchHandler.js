import { ProviderRegistry } from '../providers/ProviderRegistry.js';

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

    window.fetch = async function(...args) {
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

        // Extract user prompt from request body
        if (options?.body) {
          try {
            const requestBody = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
            userPrompt = requestBody.prompt || null;
          } catch (error) {
            console.warn('[FetchHandler] Failed to parse request body:', error);
          }
        }
      }

      // Call original fetch
      const response = await self.originalFetch.apply(this, args);

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
   * Restore original fetch
   */
  restore() {
    window.fetch = this.originalFetch;
  }
}
