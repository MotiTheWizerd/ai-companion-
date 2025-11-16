/**
 * Sync Request Factory
 * Builds requests for sync endpoints
 */

import { ENDPOINTS } from '../EndpointRegistry.js';
import { BaseRequestFactory } from './BaseRequestFactory.js';

/**
 * SyncRequestFactory class
 * Handles synchronization operations
 */
export class SyncRequestFactory extends BaseRequestFactory {
  /**
   * Full sync request
   * @param {Object} conversationData - Full conversation data
   * @returns {Object} - Request object
   */
  static full(conversationData) {
    return this.buildRequest(ENDPOINTS.SYNC.FULL, {
      data: conversationData,
    });
  }

  /**
   * Incremental sync request
   * @param {Object} changes - Changes to sync
   * @returns {Object} - Request object
   */
  static incremental(changes) {
    return this.buildRequest(ENDPOINTS.SYNC.INCREMENTAL, {
      data: this.addTimestamp({ changes }),
    });
  }

  /**
   * Sync status request
   * @param {Object} options - Query options
   * @returns {Object} - Request object
   */
  static status(options = {}) {
    return this.buildRequest(ENDPOINTS.SYNC.STATUS, {
      queryParams: options,
    });
  }
}
