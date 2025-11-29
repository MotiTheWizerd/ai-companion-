import { BaseURLMatcher } from '../base/BaseURLMatcher.js';

/**
 * ChatGPT-specific URL matcher
 */
export class ChatGPTURLMatcher extends BaseURLMatcher {
  matchesDomain(url) {
    return url.includes('chatgpt.com');
  }

  isConversationEndpoint(url) {
    return typeof url === 'string' && (
      url.includes('/backend-api/conversation') ||
      url.includes('/backend-api/f/conversation')
    );
  }

  getConversationId(url) {
    if (typeof url !== 'string') return null;

    // Check for Page URL
    const pageMatch = url.match(/chatgpt\.com\/c\/([a-f0-9-]+)/i);
    if (pageMatch) return pageMatch[1];

    // Check for API URL (absolute)
    const apiMatch = url.match(/chatgpt\.com\/backend-api\/conversation\/([a-f0-9-]+)/i);
    if (apiMatch) return apiMatch[1];

    // Check for API URL (relative)
    const relativeApiMatch = url.match(/\/backend-api\/conversation\/([a-f0-9-]+)/i);
    if (relativeApiMatch) return relativeApiMatch[1];

    return null;
  }
}
