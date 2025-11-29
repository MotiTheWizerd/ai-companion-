import { ChunkProcessor } from './ChunkProcessor.js';
import { FetchHandler } from './FetchHandler.js';
import { XHRHandler } from './XHRHandler.js';

/**
 * NetworkInterceptor - Main orchestrator for network interception
 */
export class NetworkInterceptor {
  constructor() {
    this.chunkProcessor = new ChunkProcessor();
    this.fetchHandler = new FetchHandler(this.chunkProcessor);
    this.xhrHandler = new XHRHandler();
  }

  /**
   * Initialize network interception
   */
  init() {
    this.fetchHandler.interceptFetch();
    this.xhrHandler.intercept();
    console.log('[NetworkInterceptor] Initialized (Fetch + XHR)');
  }

  /**
   * Restore original network handlers
   */
  restore() {
    this.fetchHandler.restore();
    this.xhrHandler.restore();
    console.log('[NetworkInterceptor] Restored');
  }
}
