import { BaseProvider } from '../base/BaseProvider.js';
import { ClaudeStreamParser } from './ClaudeStreamParser.js';
import { ClaudeURLMatcher } from './ClaudeURLMatcher.js';
import { CLAUDE_CONFIG } from './claude.config.js';

/**
 * Claude provider implementation
 */
export class ClaudeProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.streamParser = new ClaudeStreamParser();
    this.urlMatcher = new ClaudeURLMatcher(config);
    this.providerConfig = CLAUDE_CONFIG;
  }

  getName() {
    return 'claude';
  }

  getStreamParser() {
    return this.streamParser;
  }

  getURLMatcher() {
    return this.urlMatcher;
  }
}
