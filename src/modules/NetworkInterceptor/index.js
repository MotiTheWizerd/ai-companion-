import { ChunkProcessor } from './ChunkProcessor.js';
import { FetchHandler } from './FetchHandler.js';

/**
 * NetworkInterceptor - Main orchestrator for network interception
 */
export class NetworkInterceptor {
  constructor() {
    this.chunkProcessor = new ChunkProcessor();
    this.fetchHandler = new FetchHandler(this.chunkProcessor);
  }

  /**
   * Initialize network interception
   */
  init() {
    this.fetchHandler.interceptFetch();
    console.log('[NetworkInterceptor] Initialized');
  }

  /**
   * Restore original network handlers
   */
  restore() {
    this.fetchHandler.restore();
    console.log('[NetworkInterceptor] Restored');
  }
}
