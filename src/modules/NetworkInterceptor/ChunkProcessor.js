import { eventBus } from '../../content/core/eventBus.js';
import { ProviderRegistry } from '../providers/ProviderRegistry.js';

/**
 * ChunkProcessor - Processes stream chunks and emits events
 */
export class ChunkProcessor {
  constructor() {
    this.providerRegistry = ProviderRegistry.getInstance();
  }

  /**
   * Process user message extracted from request body
   * Emits message:input event manually
   */
  processUserMessage(userPrompt, conversationId, provider = null) {
    if (!userPrompt) return;

    console.log('[ChunkProcessor] Processing user message:', userPrompt);

    // Emit message:input event with user prompt
    eventBus.emit('message:input', {
      type: 'input_message',
      conversationId: conversationId,
      text: userPrompt,
      role: 'user'
    });
  }

  /**
   * Process a chunk of stream data
   */
  processChunk(chunk, provider = null) {
    // Use provided provider or get active one
    const activeProvider = provider || this.providerRegistry.getActiveProvider();
    if (!activeProvider) {
      console.warn('[ChunkProcessor] No active provider found');
      return;
    }

    const parser = activeProvider.getStreamParser();
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (!line.trim()) continue;

      const parsed = parser.parseChunk(line);
      if (!parsed) continue;

      this.handleParsedData(parsed, parser);
    }
  }

  /**
   * Handle parsed data and emit appropriate events
   */
  handleParsedData(parsed, parser) {
    // Handle stream done
    if (parsed.type === 'done') {
      eventBus.emit('stream:done', {});
      return;
    }

    // Check for stream completion
    const completion = parser.extractCompletion(parsed);
    if (completion) {
      eventBus.emit('stream:complete', completion);
      return;
    }

    // Check for message marker
    const marker = parser.extractMessageMarker(parsed);
    if (marker) {
      eventBus.emit('message:marker', marker);
      return;
    }

    // Check for metadata
    const metadata = parser.extractMetadata(parsed);
    if (metadata) {
      eventBus.emit('message:metadata', metadata);
      return;
    }

    // Check for input message (user message)
    const inputMessage = parser.extractInputMessage(parsed);
    if (inputMessage) {
      eventBus.emit('message:input', inputMessage);
      return;
    }

    // Check for delta events (text streaming)
    const textData = parser.extractTextFromDelta(parsed);
    if (textData) {
      if (textData.type === 'stream_start') {
        eventBus.emit('stream:start', textData);
      } else if (textData.type === 'text_chunk') {
        eventBus.emit('stream:text', textData);
      }
    }
  }
}
