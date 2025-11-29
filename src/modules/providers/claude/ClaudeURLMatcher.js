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

  getConversationId(url) {
    if (typeof url !== 'string') return null;

    // Check for API URL
    const apiMatch = url.match(/claude\.ai\/api\/organizations\/[\w-]+\/chat_conversations\/([a-f0-9-]+)/i);
    if (apiMatch) return apiMatch[1];

    // Check for Page URL
    const pageMatch = url.match(/claude\.ai\/chat\/([a-f0-9-]+)/i);
    if (pageMatch) return pageMatch[1];

    return null;
  }
}
