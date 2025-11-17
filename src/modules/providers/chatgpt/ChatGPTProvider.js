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
}
