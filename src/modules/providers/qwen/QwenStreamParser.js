/**
 * Qwen Stream Parser
 *
 * Parses Server-Sent Events (SSE) streaming format from Qwen chat API
 *
 * Stream format:
 * - data: {"response.created": {"chat_id": "...", "parent_id": "...", "response_id": "..."}}
 * - data: {"choices": [{"delta": {"role": "assistant", "content": "text", "phase": "answer", "status": "typing"}}], "usage": {...}}
 * - data: {"choices": [{"delta": {"content": "", "role": "assistant", "status": "finished", "phase": "answer"}}]}
 */

import { BaseStreamParser } from '../base/BaseStreamParser.js';

export class QwenStreamParser extends BaseStreamParser {
  /**
   * Parse SSE chunk line
   * @param {string} line - Raw SSE line (e.g., "data: {json}")
   * @returns {Object|null} - Parsed JSON object or null
   */
  parseChunk(line) {
    if (!line || !line.startsWith('data: ')) {
      return null;
    }

    const data = line.substring(6).trim(); // Remove 'data: ' prefix

    if (!data || data === '[DONE]') {
      return null;
    }

    try {
      return JSON.parse(data);
    } catch (error) {
      console.warn('[QwenStreamParser] Failed to parse chunk:', data, error);
      return null;
    }
  }

  /**
   * Extract text from delta data
   * @param {Object} data - Parsed chunk data
   * @returns {Object|null} - {type: 'stream_start'|'text_chunk', text, messageId?, conversationId?}
   */
  extractTextFromDelta(data) {
    // Check for response.created (stream start event)
    if (data && data['response.created']) {
      const { chat_id, response_id, parent_id } = data['response.created'];
      return {
        type: 'stream_start',
        conversationId: chat_id,
        messageId: response_id,
        parentId: parent_id,
      };
    }

    // Check for text chunk in choices[0].delta.content
    if (
      data &&
      data.choices &&
      Array.isArray(data.choices) &&
      data.choices.length > 0
    ) {
      const delta = data.choices[0].delta;

      if (delta && delta.content && delta.status === 'typing') {
        return {
          type: 'text_chunk',
          text: delta.content,
          role: delta.role,
          phase: delta.phase,
        };
      }
    }

    return null;
  }

  /**
   * Extract stream completion event
   * @param {Object} data - Parsed chunk data
   * @returns {Object|null} - {type: 'stream_complete', conversationId?}
   */
  extractCompletion(data) {
    // Check for status: "finished" in delta
    if (
      data &&
      data.choices &&
      Array.isArray(data.choices) &&
      data.choices.length > 0
    ) {
      const delta = data.choices[0].delta;

      if (delta && delta.status === 'finished') {
        return {
          type: 'stream_complete',
        };
      }
    }

    return null;
  }

  /**
   * Extract message marker/metadata
   * Qwen doesn't use message markers
   * @param {Object} data - Parsed chunk data
   * @returns {Object|null}
   */
  extractMessageMarker(data) {
    return null;
  }

  /**
   * Extract metadata (usage, tokens, etc.)
   * @param {Object} data - Parsed chunk data
   * @returns {Object|null}
   */
  extractMetadata(data) {
    // Extract usage information if available
    if (data && data.usage) {
      const { input_tokens, output_tokens, total_tokens } = data.usage;
      return {
        type: 'metadata',
        usage: {
          inputTokens: input_tokens,
          outputTokens: output_tokens,
          totalTokens: total_tokens,
        },
      };
    }

    return null;
  }

  /**
   * Extract user input message
   * Qwen doesn't include user input in the stream
   * @param {Object} data - Parsed chunk data
   * @returns {Object|null}
   */
  extractInputMessage(data) {
    return null;
  }
}
