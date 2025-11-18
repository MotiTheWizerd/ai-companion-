import { BaseURLMatcher } from '../base/BaseURLMatcher.js';

/**
 * Claude-specific URL matcher
 */
export class ClaudeURLMatcher extends BaseURLMatcher {
  matchesDomain(url) {
    return url.includes('claude.ai');
  }

  isConversationEndpoint(url) {
    return typeof url === 'string' && url.includes('/completion');
  }
}
