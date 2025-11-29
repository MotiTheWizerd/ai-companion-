/**
 * Abstract base class for URL matchers
 */
export class BaseURLMatcher {
  constructor(config) {
    this.config = config;
  }

  /**
   * Check if URL belongs to this provider's domain
   * @param {string} url
   * @returns {boolean}
   */
  matchesDomain(url) {
    throw new Error('matchesDomain() must be implemented');
  }

  /**
   * Check if URL is a conversation/message endpoint
   * @param {string} url
   * @returns {boolean}
   */
  isConversationEndpoint(url) {
    throw new Error('isConversationEndpoint() must be implemented');
  }
  /**
   * Extract conversation ID from URL if it's a conversation page
   * @param {string} url
   * @returns {string|null} Conversation ID or null
   */
  getConversationId(url) {
    return null;
  }
}
