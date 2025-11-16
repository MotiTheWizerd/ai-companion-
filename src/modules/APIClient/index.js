/**
 * API Client Module
 * Event-driven HTTP client for backend communication
 * Refactored with clean separation of concerns
 */

import { eventBus } from '../../content/core/eventBus.js';
import { EVENTS } from '../../content/core/constants.js';
import { Logger } from '../../content/modules/utils/logger.js';

import { ConfigurationManager } from './core/ConfigurationManager.js';
import { RequestStateManager } from './core/RequestStateManager.js';
import { RequestLifecycleHandler } from './core/RequestLifecycleHandler.js';
import { EventListenerManager } from './core/EventListenerManager.js';

/**
 * APIClient class
 * Orchestrates request handling using specialized modules
 */
export class APIClient {
  constructor(config = {}) {
    // Initialize configuration and services
    this.config = ConfigurationManager.createConfig(config);

    // Extract service references
    this.queue = this.config.queue;
    this.circuitBreaker = this.config.circuitBreaker;
    this.retryPolicy = this.config.retryPolicy;
    this.executor = this.config.executor;

    // Initialize core modules
    this.stateManager = new RequestStateManager(this.queue);

    this.lifecycleHandler = new RequestLifecycleHandler({
      executor: this.executor,
      circuitBreaker: this.circuitBreaker,
      retryPolicy: this.retryPolicy,
      stateManager: this.stateManager,
      queue: this.queue,
      config: this.config,
    });

    this.eventManager = new EventListenerManager(this, this.config);

    // Processing flag
    this.isProcessing = false;
  }

  /**
   * Initialize the API client
   */
  init() {
    Logger.api('Initializing API Client...');
    this.eventManager.setupEventListeners();
    Logger.api(`Ready - Base URL: ${this.config.baseURL}`);
  }

  /**
   * Enqueue a request
   * @param {Object} request - Request configuration
   * @returns {string} - Request ID
   */
  enqueueRequest(request) {
    const queuedRequest = this.stateManager.createQueuedRequest(request);
    const requestId = queuedRequest.id;

    this.queue.enqueue(queuedRequest);

    Logger.api(`Enqueued: ${request.method} ${request.endpoint} [${requestId}]`);

    eventBus.emit(EVENTS.API_REQUEST_QUEUED, {
      requestId,
      request: queuedRequest,
    });

    this.processQueue();

    return requestId;
  }

  /**
   * Process the request queue
   */
  async processQueue() {
    if (this.isProcessing) return;
    if (this.queue.isEmpty()) return;

    // Check circuit breaker
    if (!this.circuitBreaker.isRequestAllowed()) {
      Logger.api('Circuit breaker blocking requests');
      return;
    }

    this.isProcessing = true;

    while (!this.queue.isEmpty() && !this.queue.isAtLimit()) {
      const request = this.queue.dequeue();
      if (request) {
        this.lifecycleHandler.executeRequest(request);
      }
    }

    this.isProcessing = false;
  }

  /**
   * Get request status
   * @param {string} requestId - Request ID
   * @returns {Object|undefined}
   */
  getRequestStatus(requestId) {
    return this.stateManager.getRequestStatus(requestId);
  }

  /**
   * Get statistics
   * @returns {Object}
   */
  getStats() {
    return this.stateManager.getStats(this.circuitBreaker, this.retryPolicy);
  }

  /**
   * Update configuration
   * @param {Object} config - New configuration
   */
  updateConfig(config) {
    ConfigurationManager.updateConfig(config, {
      executor: this.executor,
      retryPolicy: this.retryPolicy,
    });

    Object.assign(this.config, config);
  }

  /**
   * Cleanup and destroy
   */
  destroy() {
    Logger.api('Shutting down API Client...');
    this.eventManager.removeEventListeners();
    this.queue.clear();
    this.circuitBreaker.destroy();
    this.stateManager.clearHistory();
  }
}
