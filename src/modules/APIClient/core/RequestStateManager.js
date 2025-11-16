/**
 * RequestStateManager Module
 * Manages request state tracking and history
 */

import { REQUEST_STATUS } from '../types/constants.js';

/**
 * RequestStateManager class
 * Tracks request states, generates IDs, and maintains history
 */
export class RequestStateManager {
  constructor(queue) {
    this.queue = queue;
    this.requestHistory = new Map();
  }

  /**
   * Generate unique request ID
   * @returns {string} - Unique request ID
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create a queued request object with metadata
   * @param {Object} request - Request configuration
   * @returns {Object} - Enhanced request object
   */
  createQueuedRequest(request) {
    const requestId = this.generateRequestId();

    return {
      id: requestId,
      ...request,
      status: REQUEST_STATUS.PENDING,
      attempts: 0,
      enqueuedAt: Date.now(),
    };
  }

  /**
   * Store request in history
   * @param {string} requestId - Request ID
   * @param {Object} request - Request object
   * @param {Object} additionalData - Additional data (response, error, etc.)
   */
  storeInHistory(requestId, request, additionalData = {}) {
    this.requestHistory.set(requestId, {
      ...request,
      ...additionalData,
      completedAt: Date.now(),
    });
  }

  /**
   * Get request status
   * @param {string} requestId - Request ID
   * @returns {Object|undefined} - Request object or undefined
   */
  getRequestStatus(requestId) {
    // Check active requests first
    const activeRequest = this.queue.getActive(requestId);
    if (activeRequest) {
      return activeRequest;
    }

    // Check history
    return this.requestHistory.get(requestId);
  }

  /**
   * Get all statistics
   * @param {Object} circuitBreaker - Circuit breaker instance
   * @param {Object} retryPolicy - Retry policy instance
   * @returns {Object} - Complete statistics
   */
  getStats(circuitBreaker, retryPolicy) {
    return {
      queue: this.queue.getStats(),
      circuitBreaker: circuitBreaker.getStats(),
      retryPolicy: retryPolicy.getConfig(),
      totalProcessed: this.requestHistory.size,
    };
  }

  /**
   * Clear request history
   */
  clearHistory() {
    this.requestHistory.clear();
  }

  /**
   * Get history size
   * @returns {number}
   */
  getHistorySize() {
    return this.requestHistory.size;
  }

  /**
   * Get request by ID from history
   * @param {string} requestId - Request ID
   * @returns {Object|undefined}
   */
  getFromHistory(requestId) {
    return this.requestHistory.get(requestId);
  }
}
