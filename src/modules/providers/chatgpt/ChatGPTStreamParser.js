import { BaseStreamParser } from '../base/BaseStreamParser.js';

/**
 * ChatGPT-specific stream parser
 * Parses ChatGPT's SSE format with JSON patch operations
 */
export class ChatGPTStreamParser extends BaseStreamParser {
  parseChunk(line) {
    if (!line.startsWith('data: ')) return null;

    const data = line.slice(6).trim();
    if (data === '[DONE]') {
      return { type: 'done' };
    }

    try {
      return JSON.parse(data);
    } catch (error) {
      console.warn('[ChatGPTStreamParser] Failed to parse:', data);
      return null;
    }
  }

  extractTextFromDelta(deltaData) {
    // Check for "o": "add" - stream start
    if (deltaData.o === 'add') {
      return {
        type: 'stream_start',
        messageId: deltaData.v?.message?.id,
        conversationId: deltaData.v?.conversation_id
      };
    }

    // Check for "o": "patch" with text append
    if (deltaData.o === 'patch' && deltaData.v && Array.isArray(deltaData.v)) {
      const textChunks = [];

      for (const operation of deltaData.v) {
        if (operation.p === '/message/content/parts/0' && operation.o === 'append') {
          textChunks.push(operation.v);
        }
      }

      if (textChunks.length > 0) {
        return {
          type: 'text_chunk',
          text: textChunks.join('')
        };
      }
    }

    // Check for shorthand format (just "v" array)
    if (deltaData.v && !deltaData.o && Array.isArray(deltaData.v)) {
      const textChunks = [];

      for (const operation of deltaData.v) {
        if (operation.p === '/message/content/parts/0' && operation.o === 'append') {
          textChunks.push(operation.v);
        }
      }

      if (textChunks.length > 0) {
        return {
          type: 'text_chunk',
          text: textChunks.join('')
        };
      }
    }

    return null;
  }

  extractCompletion(data) {
    if (data.type === 'message_stream_complete') {
      return {
        type: 'stream_complete',
        conversationId: data.conversation_id
      };
    }
    return null;
  }

  extractMessageMarker(data) {
    if (data.type === 'message_marker') {
      return {
        type: 'message_marker',
        conversationId: data.conversation_id,
        messageId: data.message_id,
        marker: data.marker,
        event: data.event
      };
    }
    return null;
  }

  extractMetadata(data) {
    if (data.type === 'server_ste_metadata') {
      return {
        type: 'metadata',
        modelSlug: data.metadata?.model_slug,
        messageId: data.metadata?.message_id,
        conversationId: data.conversation_id
      };
    }
    return null;
  }

  extractInputMessage(data) {
    if (data.type === 'input_message') {
      return {
        type: 'input_message',
        conversationId: data.conversation_id,
        messageId: data.input_message?.id,
        text: data.input_message?.content?.parts?.[0] || '',
        role: 'user'
      };
    }
    return null;
  }
}
