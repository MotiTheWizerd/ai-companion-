/**
 * Qwen Provider
 *
 * Main provider class for Qwen chat integration
 * Orchestrates URL matching and stream parsing
 */

import { BaseProvider } from '../base/BaseProvider.js';
import { QwenStreamParser } from './QwenStreamParser.js';
import { QwenURLMatcher } from './QwenURLMatcher.js';
import { QWEN_CONFIG } from './qwen.config.js';

export class QwenProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.streamParser = new QwenStreamParser();
    this.urlMatcher = new QwenURLMatcher(config);
    this.providerConfig = QWEN_CONFIG;
  }

  /**
   * Get provider name
   * @returns {string}
   */
  getName() {
    return 'qwen';
  }

  /**
   * Get URL matcher instance
   * @returns {QwenURLMatcher}
   */
  getURLMatcher() {
    return this.urlMatcher;
  }

  /**
   * Get stream parser instance
   * @returns {QwenStreamParser}
   */
  getStreamParser() {
    return this.streamParser;
  }
}
