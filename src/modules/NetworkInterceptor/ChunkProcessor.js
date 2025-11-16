import { eventBus } from '../../content/core/eventBus.js';
import { StreamParser } from '../streamParser.js';

/**
 * ChunkProcessor - Processes stream chunks and emits events
 */
export class ChunkProcessor {
  constructor() {
    this.parser = new StreamParser();
  }

  /**
   * Process a chunk of stream data
   */
  processChunk(chunk) {
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (!line.trim()) continue;

      const parsed = this.parser.parseChunk(line);
      if (!parsed) continue;

      this.handleParsedData(parsed);
    }
  }

  /**
   * Handle parsed data and emit appropriate events
   */
  handleParsedData(parsed) {
    // Handle stream done
    if (parsed.type === 'done') {
      eventBus.emit('stream:done', {});
      return;
    }

    // Check for stream completion
    const completion = this.parser.extractCompletion(parsed);
    if (completion) {
      eventBus.emit('stream:complete', completion);
      return;
    }

    // Check for message marker
    const marker = this.parser.extractMessageMarker(parsed);
    if (marker) {
      eventBus.emit('message:marker', marker);
      return;
    }

    // Check for metadata
    const metadata = this.parser.extractMetadata(parsed);
    if (metadata) {
      eventBus.emit('message:metadata', metadata);
      return;
    }

    // Check for input message (user message)
    const inputMessage = this.parser.extractInputMessage(parsed);
    if (inputMessage) {
      eventBus.emit('message:input', inputMessage);
      return;
    }

    // Check for delta events (text streaming)
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
