import { BaseStreamParser } from '../base/BaseStreamParser.js';

/**
 * Claude-specific stream parser
 * Parses Claude's SSE format with event-based streaming
 */
export class ClaudeStreamParser extends BaseStreamParser {
  parseChunk(line) {
    // Claude uses SSE format with "event:" and "data:" lines
    if (line.startsWith('event: ')) {
      const eventType = line.slice(7).trim();
      return { _event: eventType };
    }

    if (line.startsWith('data: ')) {
      const data = line.slice(6).trim();
      try {
        return JSON.parse(data);
      } catch (error) {
        console.warn('[ClaudeStreamParser] Failed to parse:', data);
        return null;
      }
    }

    return null;
  }

  extractTextFromDelta(data) {
    // Check for message_start event
    if (data.type === 'message_start' && data.message) {
      return {
        type: 'stream_start',
        messageId: data.message.uuid,
        conversationId: data.message.parent_uuid
      };
    }

    // Check for content_block_delta with text
    if (data.type === 'content_block_delta' && data.delta?.type === 'text_delta') {
      return {
        type: 'text_chunk',
        text: data.delta.text
      };
    }

    return null;
  }

  extractCompletion(data) {
    // Check for message_stop event
    if (data.type === 'message_stop') {
      return {
        type: 'stream_complete'
      };
    }

    // Also check message_delta for stop_reason
    if (data.type === 'message_delta' && data.delta?.stop_reason) {
      return {
        type: 'stream_complete',
        stopReason: data.delta.stop_reason
      };
    }

    return null;
  }

  extractMessageMarker(data) {
    // Claude doesn't use message markers in the same way as ChatGPT
    // But we can use content_block_start/stop as markers
    if (data.type === 'content_block_start') {
      return {
        type: 'content_block_start',
        index: data.index,
        contentType: data.content_block?.type
      };
    }

    if (data.type === 'content_block_stop') {
      return {
        type: 'content_block_stop',
        index: data.index,
        stopTimestamp: data.stop_timestamp
      };
    }

    return null;
  }

  extractMetadata(data) {
    // Extract metadata from message_start
    if (data.type === 'message_start' && data.message) {
      return {
        type: 'metadata',
        model: data.message.model,
        messageId: data.message.uuid,
        role: data.message.role
      };
    }

    // Extract message limits
    if (data.type === 'message_limit') {
      return {
        type: 'message_limit',
        limitInfo: data.message_limit
      };
    }

    return null;
  }

  extractInputMessage(data) {
    // Claude doesn't send user input in the stream response
    // This would need to be captured from the request body
    return null;
  }
}
