import { eventBus } from './eventBus.js';
import { StreamParser } from './streamParser.js';

/**
 * Intercepts network requests to ChatGPT conversation endpoint
 */
export class NetworkInterceptor {
  constructor() {
    this.parser = new StreamParser();
    this.originalFetch = window.fetch;
  }

  init() {
    this.interceptFetch();

    // Initialize UI Controls
    console.log('[Interceptor] Attempting to load UIControls...');
    import('./UIControls/index.js').then(module => {
      console.log('[Interceptor] UIControls module loaded');
      const uiController = new module.UIController();
      uiController.init();
    }).catch(err => console.error('[Interceptor] Failed to load UIControls:', err));

    console.log('[Interceptor] Initialized');
  }

  interceptFetch() {
    const self = this;

    window.fetch = async function (...args) {
      const [url, options] = args;

      // Call original fetch
      const response = await self.originalFetch.apply(this, args);

      // Only intercept conversation endpoint
      if (typeof url === 'string' && url.includes('/conversation')) {
        return self.handleConversationStream(response);
      }

      return response;
    };
  }

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
            this.processChunk(chunk);

            // Pass through to original consumer
            controller.enqueue(value);
          }
        } catch (error) {
          console.error('[Interceptor] Stream error:', error);
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

  processChunk(chunk) {
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (!line.trim()) continue;

      const parsed = this.parser.parseChunk(line);
      if (!parsed) continue;

      // Handle different event types
      if (parsed.type === 'done') {
        eventBus.emit('stream:done', {});
        continue;
      }

      // Check for stream completion
      const completion = this.parser.extractCompletion(parsed);
      if (completion) {
        eventBus.emit('stream:complete', completion);
        continue;
      }

      // Check for message marker
      const marker = this.parser.extractMessageMarker(parsed);
      if (marker) {
        eventBus.emit('message:marker', marker);
        continue;
      }

      // Check for metadata
      const metadata = this.parser.extractMetadata(parsed);
      if (metadata) {
        eventBus.emit('message:metadata', metadata);
        continue;
      }

      // Check for input message (user message)
      const inputMessage = this.parser.extractInputMessage(parsed);
      if (inputMessage) {
        eventBus.emit('message:input', inputMessage);
        continue;
      }

      // Check for delta events (from event: delta)
      const textData = this.parser.extractTextFromDelta(parsed);
      if (textData) {
        if (textData.type === 'stream_start') {
          eventBus.emit('stream:start', textData);
        } else if (textData.type === 'text_chunk') {
          eventBus.emit('stream:text', textData);
        }
      }
    }
  }
}
