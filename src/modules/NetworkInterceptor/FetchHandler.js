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
      const [url] = args;

      // Call original fetch
      const response = await self.originalFetch.apply(this, args);

      // Check if ANY provider matches this URL
      const activeProvider = self.providerRegistry.getActiveProvider();
      if (activeProvider && activeProvider.getURLMatcher().isConversationEndpoint(url)) {
        return self.handleConversationStream(response, activeProvider);
      }

      return response;
    };
  }

  /**
   * Handle conversation stream response
   */
  async handleConversationStream(response, provider) {
    const originalBody = response.body;
    if (!originalBody) return response;

    const reader = originalBody.getReader();
    const decoder = new TextDecoder();

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
