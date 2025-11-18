import { BaseProvider } from '../base/BaseProvider.js';
import { ClaudeStreamParser } from './ClaudeStreamParser.js';
import { ClaudeURLMatcher } from './ClaudeURLMatcher.js';

/**
 * Claude provider implementation
 */
export class ClaudeProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.streamParser = new ClaudeStreamParser();
    this.urlMatcher = new ClaudeURLMatcher(config);
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
