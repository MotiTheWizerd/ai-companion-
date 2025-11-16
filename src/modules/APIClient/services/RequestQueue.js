/**
 * RequestQueue Module
 * Manages FIFO queue with concurrency control
 */

/**
 * RequestQueue class
 * Handles request queueing and concurrency limits
 */
export class RequestQueue {
  constructor(maxConcurrent = 5) {
    this.queue = [];
    this.active = new Map();
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * Add request to queue
   * @param {Object} request - Request object
   * @returns {string} - Request ID
   */
  enqueue(request) {
    this.queue.push(request);
    return request.id;
  }

  /**
   * Add request to front of queue (priority)
   * @param {Object} request - Request object
   * @returns {string} - Request ID
   */
  enqueuePriority(request) {
    this.queue.unshift(request);
    return request.id;
  }

  /**
   * Get next request from queue if concurrency allows
   * @returns {Object|null} - Request object or null
   */
  dequeue() {
    if (this.queue.length === 0) return null;
    if (this.getActiveCount() >= this.maxConcurrent) return null;

    return this.queue.shift();
  }

  /**
   * Mark request as active
   * @param {string} requestId - Request ID
   * @param {Object} request - Request object
   */
  markActive(requestId, request) {
    this.active.set(requestId, request);
  }

  /**
   * Mark request as complete and remove from active
   * @param {string} requestId - Request ID
   */
  markComplete(requestId) {
    this.active.delete(requestId);
  }

  /**
   * Get active request by ID
   * @param {string} requestId - Request ID
   * @returns {Object|undefined} - Request object
   */
  getActive(requestId) {
    return this.active.get(requestId);
  }

  /**
   * Get count of active (in-flight) requests
   * @returns {number}
   */
  getActiveCount() {
    return this.active.size;
  }

  /**
   * Get count of pending (queued) requests
   * @returns {number}
   */
  getPendingCount() {
    return this.queue.length;
  }

  /**
   * Check if queue is empty
   * @returns {boolean}
   */
  isEmpty() {
    return this.queue.length === 0;
  }

  /**
   * Check if at concurrency limit
   * @returns {boolean}
   */
  isAtLimit() {
    return this.getActiveCount() >= this.maxConcurrent;
  }

  /**
   * Clear all pending requests
   */
  clearPending() {
    this.queue = [];
  }

  /**
   * Clear all active requests
   */
  clearActive() {
    this.active.clear();
  }

  /**
   * Clear everything
   */
  clear() {
    this.clearPending();
    this.clearActive();
  }

  /**
   * Get queue statistics
   * @returns {Object}
   */
  getStats() {
    return {
      pending: this.getPendingCount(),
      active: this.getActiveCount(),
      maxConcurrent: this.maxConcurrent,
      atLimit: this.isAtLimit(),
    };
  }
}
