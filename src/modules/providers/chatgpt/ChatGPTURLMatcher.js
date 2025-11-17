import { BaseURLMatcher } from '../base/BaseURLMatcher.js';

/**
 * ChatGPT-specific URL matcher
 */
export class ChatGPTURLMatcher extends BaseURLMatcher {
  matchesDomain(url) {
    return url.includes('chatgpt.com');
  }

  isConversationEndpoint(url) {
    return typeof url === 'string' && url.includes('/conversation');
  }
}
