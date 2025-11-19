import { BaseProvider } from '../base/BaseProvider.js';
import { ChatGPTStreamParser } from './ChatGPTStreamParser.js';
import { ChatGPTURLMatcher } from './ChatGPTURLMatcher.js';

/**
 * ChatGPT provider implementation
 */
export class ChatGPTProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.streamParser = new ChatGPTStreamParser();
    this.urlMatcher = new ChatGPTURLMatcher(config);
  }

  getName() {
    return 'chatgpt';
  }

  getStreamParser() {
    return this.streamParser;
  }

  getURLMatcher() {
    return this.urlMatcher;
  }

  /**
   * Handle/Modify request body before sending
   * @param {Object} body - Parsed request body
   * @returns {Object} Modified request body
   */
  handleRequest(body) {
    try {
      // Check for standard message structure
      if (body?.messages?.[0]?.content?.parts?.[0]) {
        const currentText = body.messages[0].content.parts[0];

        // Only modify if we have actual text
        if (typeof currentText === 'string' && currentText.trim().length > 0) {
          // Construct the memory block
          const memoryBlock =
            "[semantix-memory-block]\n" +
            "  Hello wolrd (test)\n" +
            "[semantix-end-memory-block]\n\n";

          // Prepend memory block to the user's message
          body.messages[0].content.parts[0] = memoryBlock + currentText;
        }
      }
    } catch (error) {
      console.warn('[ChatGPTProvider] Failed to modify request:', error);
    }
    return body;
  }

  /**
   * Extract user prompt from request body
   * @param {Object} body - Parsed request body
   * @returns {string|null} User prompt or null
   */
  extractPrompt(body) {
    try {
      return body?.messages?.[0]?.content?.parts?.[0] || null;
    } catch (error) {
      return null;
    }
  }
}
