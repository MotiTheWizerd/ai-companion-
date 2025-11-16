/**
 * FetchHandler - Handles fetch interception and stream processing
 */
export class FetchHandler {
  constructor(chunkProcessor) {
    this.chunkProcessor = chunkProcessor;
    this.originalFetch = window.fetch;
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

      // Only intercept conversation endpoint
      if (typeof url === 'string' && url.includes('/conversation')) {
        return self.handleConversationStream(response);
      }

      return response;
    };
  }

  /**
   * Handle conversation stream response
   */
  async handleConversationStream(response) {
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
            this.chunkProcessor.processChunk(chunk);

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
