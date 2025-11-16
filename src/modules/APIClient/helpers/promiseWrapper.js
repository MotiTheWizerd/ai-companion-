/**
 * Promise-based API Wrapper
 * Returns promises that resolve/reject based on API events
 */

import { eventBus } from '../../../content/core/eventBus.js';
import { EVENTS } from '../../../content/core/constants.js';
import { RequestBuilder } from '../endpoints.js';

/**
 * APIPromise class
 * Provides promise-based wrapper for API operations
 */
export class APIPromise {
  /**
   * Make an API request and return a promise
   * @param {Object} request - Request configuration
   * @returns {Promise} - Promise that resolves with response or rejects with error
   */
  static makeRequest(request) {
    return new Promise((resolve, reject) => {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const requestWithId = { ...request, id: requestId };

      // Listen for success
      const successHandler = (data) => {
        if (data.requestId === requestId) {
          eventBus.off(EVENTS.API_REQUEST_SUCCESS, successHandler);
          eventBus.off(EVENTS.API_REQUEST_FAILED, failureHandler);
          resolve(data.response);
        }
      };

      // Listen for failure
      const failureHandler = (data) => {
        if (data.requestId === requestId) {
          eventBus.off(EVENTS.API_REQUEST_SUCCESS, successHandler);
          eventBus.off(EVENTS.API_REQUEST_FAILED, failureHandler);
          reject(data.error);
        }
      };

      eventBus.on(EVENTS.API_REQUEST_SUCCESS, successHandler);
      eventBus.on(EVENTS.API_REQUEST_FAILED, failureHandler);

      // Emit the request
      eventBus.emit(EVENTS.API_REQUEST, requestWithId);
    });
  }

  /**
   * Send conversation and wait for response
   */
  static async sendConversation(conversationData) {
    const request = RequestBuilder.createConversation(conversationData);
    return this.makeRequest(request);
  }

  /**
   * Add message and wait for response
   */
  static async addMessage(conversationId, message) {
    const request = RequestBuilder.addMessage(conversationId, message);
    return this.makeRequest(request);
  }

  /**
   * Sync and wait for completion
   */
  static async syncFull(conversationData) {
    const request = RequestBuilder.syncFull(conversationData);

    eventBus.emit(EVENTS.API_SYNC_START, {
      conversationId: conversationData.conversationId,
      syncType: 'full',
    });

    return this.makeRequest(request);
  }
}
