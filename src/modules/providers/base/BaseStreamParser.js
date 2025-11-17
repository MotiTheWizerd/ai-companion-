/**
 * Abstract base class for stream parsers
 * Defines the contract all parsers must follow
 */
export class BaseStreamParser {
  constructor() {
    if (this.constructor === BaseStreamParser) {
      throw new Error('BaseStreamParser is abstract and cannot be instantiated');
    }
  }

  /**
   * Parse a chunk/line from stream
   * @param {string} line - Raw stream line
   * @returns {Object|null} - Parsed data or null
   */
  parseChunk(line) {
    throw new Error('parseChunk() must be implemented');
  }

  /**
   * Extract text delta from parsed data
   * @param {Object} data - Parsed chunk data
   * @returns {Object|null} - {type: 'stream_start'|'text_chunk', text?, messageId?, conversationId?}
   */
  extractTextFromDelta(data) {
    throw new Error('extractTextFromDelta() must be implemented');
  }

  /**
   * Extract stream completion event
   * @param {Object} data - Parsed chunk data
   * @returns {Object|null} - {type: 'stream_complete', conversationId}
   */
  extractCompletion(data) {
    throw new Error('extractCompletion() must be implemented');
  }

  /**
   * Extract message marker/metadata
   * @param {Object} data - Parsed chunk data
   * @returns {Object|null}
   */
  extractMessageMarker(data) {
    throw new Error('extractMessageMarker() must be implemented');
  }

  /**
   * Extract metadata (model, etc.)
   * @param {Object} data - Parsed chunk data
   * @returns {Object|null}
   */
  extractMetadata(data) {
    throw new Error('extractMetadata() must be implemented');
  }

  /**
   * Extract user input message
   * @param {Object} data - Parsed chunk data
   * @returns {Object|null}
   */
  extractInputMessage(data) {
    throw new Error('extractInputMessage() must be implemented');
  }
}
