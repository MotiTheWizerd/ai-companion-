/**
 * Abstract base class for AI provider implementations
 * All providers must implement these methods
 */
export class BaseProvider {
  constructor(config) {
    if (this.constructor === BaseProvider) {
      throw new Error('BaseProvider is abstract and cannot be instantiated');
    }
    this.config = config;
  }

  /**
   * Get provider name
   * @returns {string}
   */
  getName() {
    throw new Error('getName() must be implemented');
  }

  /**
   * Get URL matcher instance
   * @returns {BaseURLMatcher}
   */
  getURLMatcher() {
    throw new Error('getURLMatcher() must be implemented');
  }

  /**
   * Get stream parser instance
   * @returns {BaseStreamParser}
   */
  getStreamParser() {
    throw new Error('getStreamParser() must be implemented');
  }

  /**
   * Check if this provider is active on current page
   * @returns {boolean}
   */
  isActive() {
    return this.getURLMatcher().matchesDomain(window.location.href);
  }

  /**
   * Handle/Modify request body before sending
   * @param {Object} body - Parsed request body
   * @returns {Object} Modified request body
   */
  handleRequest(body) {
    return body;
  }

  /**
   * Extract user prompt from request body
   * @param {Object} body - Parsed request body
   * @returns {string|null} User prompt or null
   */
  extractPrompt(body) {
    return body?.prompt || null;
  }
}
