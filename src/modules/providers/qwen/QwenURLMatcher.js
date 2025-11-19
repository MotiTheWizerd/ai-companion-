/**
 * Qwen URL Matcher
 *
 * Handles URL detection and endpoint matching for Qwen chat
 */

import { BaseURLMatcher } from '../base/BaseURLMatcher.js';

export class QwenURLMatcher extends BaseURLMatcher {
  /**
   * Check if URL belongs to Qwen domain
   * @param {string} url
   * @returns {boolean}
   */
  matchesDomain(url) {
    return url.includes('chat.qwen.ai');
  }

  /**
   * Check if URL is a Qwen conversation endpoint
   * @param {string} url
   * @returns {boolean}
   */
  isConversationEndpoint(url) {
    return url.includes('/c/');
  }
}
