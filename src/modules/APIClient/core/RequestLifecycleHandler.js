/**
 * RequestLifecycleHandler Module
 * Manages the complete request lifecycle from execution to completion
 */

import { eventBus } from '../../../content/core/eventBus.js';
import { EVENTS } from '../../../content/core/constants.js';
import { Logger } from '../../../content/modules/utils/logger.js';
import { REQUEST_STATUS } from '../types/constants.js';

/**
 * RequestLifecycleHandler class
 * Orchestrates request execution, success/failure handling, and retries
 */
export class RequestLifecycleHandler {
  constructor({ executor, circuitBreaker, retryPolicy, stateManager, queue, config }) {
    this.executor = executor;
    this.circuitBreaker = circuitBreaker;
    this.retryPolicy = retryPolicy;
    this.stateManager = stateManager;
    this.queue = queue;
    this.config = config;
  }

  /**
   * Execute a request
   * @param {Object} request - Request object
   */
  async executeRequest(request) {
    const { id, method, endpoint } = request;

    // Update status and tracking
    request.status = REQUEST_STATUS.IN_FLIGHT;
    request.attempts++;
    this.queue.markActive(id, request);

    Logger.api(
      `Executing: ${method} ${endpoint} [Attempt ${request.attempts}/${this.config.retryAttempts}]`
    );

    eventBus.emit(EVENTS.API_REQUEST_START, { requestId: id, request });

    try {
      const response = await this.executor.execute(request);
      this.handleSuccess(request, response);
    } catch (error) {
      this.handleFailure(request, error);
    }
  }

  /**
   * Handle successful request
   * @param {Object} request - Request object
   * @param {Object} response - Response data
   */
  handleSuccess(request, response) {
    const { id, method, endpoint } = request;

    request.status = REQUEST_STATUS.SUCCESS;
    this.queue.markComplete(id);
    this.stateManager.storeInHistory(id, request, { response });

    Logger.api(`Success: ${method} ${endpoint} [${id}]`);

    eventBus.emit(EVENTS.API_REQUEST_SUCCESS, {
      requestId: id,
      request,
      response,
    });

    // Update circuit breaker
    this.circuitBreaker.recordSuccess();
  }

  /**
   * Handle failed request
   * @param {Object} request - Request object
   * @param {Error} error - Error object
   */
  handleFailure(request, error) {
    const { method, endpoint } = request;

    Logger.api(`Error: ${method} ${endpoint} - ${error.message}`);

    // Check if should retry
    if (this.retryPolicy.shouldRetry(request.attempts)) {
      this.scheduleRetry(request, error);
    } else {
      this.handleFinalFailure(request, error);
    }
  }

  /**
   * Schedule a retry
   * @param {Object} request - Request object
   * @param {Error} error - Error object
   */
  scheduleRetry(request, error) {
    const { id } = request;

    request.status = REQUEST_STATUS.RETRY;
    const delay = this.retryPolicy.calculateDelay(request.attempts);

    Logger.api(`Retrying in ${delay}ms... [${id}]`);

    eventBus.emit(EVENTS.API_REQUEST_RETRY, {
      requestId: id,
      request,
      error,
      nextAttempt: request.attempts + 1,
      delay,
    });

    setTimeout(() => {
      this.queue.enqueuePriority(request);
      this.queue.markComplete(id);
      // Trigger queue processing externally
      eventBus.emit(EVENTS.API_PROCESS_QUEUE);
    }, delay);
  }

  /**
   * Handle final failure after all retries
   * @param {Object} request - Request object
   * @param {Error} error - Error object
   */
  handleFinalFailure(request, error) {
    const { id, method, endpoint } = request;

    request.status = REQUEST_STATUS.FAILED;
    this.queue.markComplete(id);
    this.stateManager.storeInHistory(id, request, { error });

    Logger.api(`Failed: ${method} ${endpoint} [${id}]`);

    eventBus.emit(EVENTS.API_REQUEST_FAILED, {
      requestId: id,
      request,
      error,
    });

    // Update circuit breaker
    const circuitOpened = this.circuitBreaker.recordFailure();

    if (circuitOpened) {
      Logger.api(
        `Circuit breaker OPEN - Too many failures (${this.circuitBreaker.failures})`
      );

      eventBus.emit(EVENTS.API_CIRCUIT_OPEN, {
        failures: this.circuitBreaker.failures,
        threshold: this.circuitBreaker.threshold,
      });
    }
  }
}
