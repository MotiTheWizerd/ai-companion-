/**
 * CircuitBreaker Module
 * Implements circuit breaker pattern for fault tolerance
 */

/**
 * Circuit breaker states
 */
export const CIRCUIT_STATE = {
  CLOSED: 'closed',     // Normal operation
  OPEN: 'open',         // Blocking requests
  HALF_OPEN: 'half-open', // Testing with limited requests
};

/**
 * CircuitBreaker class
 * Protects against cascading failures
 */
export class CircuitBreaker {
  constructor(config = {}) {
    this.threshold = config.threshold || 5;
    this.timeout = config.timeout || 60000; // 60 seconds
    this.failures = 0;
    this.successes = 0;
    this.state = CIRCUIT_STATE.CLOSED;
    this.lastFailureTime = null;
    this.resetTimer = null;
  }

  /**
   * Record a successful request
   */
  recordSuccess() {
    this.successes++;

    if (this.state === CIRCUIT_STATE.HALF_OPEN) {
      // Success in half-open state - close the circuit
      this.close();
    } else if (this.state === CIRCUIT_STATE.CLOSED) {
      // Reset failure count on success
      this.failures = 0;
    }
  }

  /**
   * Record a failed request
   * @returns {boolean} - True if circuit opened
   */
  recordFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === CIRCUIT_STATE.HALF_OPEN) {
      // Failure in half-open state - reopen circuit
      this.open();
      return true;
    }

    if (this.state === CIRCUIT_STATE.CLOSED && this.failures >= this.threshold) {
      // Threshold reached - open circuit
      this.open();
      return true;
    }

    return false;
  }

  /**
   * Open the circuit (block requests)
   */
  open() {
    this.state = CIRCUIT_STATE.OPEN;
    this.scheduleHalfOpen();
  }

  /**
   * Close the circuit (allow requests)
   */
  close() {
    this.state = CIRCUIT_STATE.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.clearResetTimer();
  }

  /**
   * Half-open the circuit (test with one request)
   */
  halfOpen() {
    this.state = CIRCUIT_STATE.HALF_OPEN;
  }

  /**
   * Schedule transition to half-open state
   */
  scheduleHalfOpen() {
    this.clearResetTimer();

    this.resetTimer = setTimeout(() => {
      this.halfOpen();
    }, this.timeout);
  }

  /**
   * Clear reset timer
   */
  clearResetTimer() {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
  }

  /**
   * Check if requests are allowed
   * @returns {boolean}
   */
  isRequestAllowed() {
    switch (this.state) {
      case CIRCUIT_STATE.CLOSED:
        return true;
      case CIRCUIT_STATE.OPEN:
        return false;
      case CIRCUIT_STATE.HALF_OPEN:
        // In half-open, allow one test request
        return true;
      default:
        return false;
    }
  }

  /**
   * Check if circuit is open
   * @returns {boolean}
   */
  isOpen() {
    return this.state === CIRCUIT_STATE.OPEN;
  }

  /**
   * Check if circuit is closed
   * @returns {boolean}
   */
  isClosed() {
    return this.state === CIRCUIT_STATE.CLOSED;
  }

  /**
   * Check if circuit is half-open
   * @returns {boolean}
   */
  isHalfOpen() {
    return this.state === CIRCUIT_STATE.HALF_OPEN;
  }

  /**
   * Get current state
   * @returns {string}
   */
  getState() {
    return this.state;
  }

  /**
   * Get statistics
   * @returns {Object}
   */
  getStats() {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      threshold: this.threshold,
      timeout: this.timeout,
      lastFailureTime: this.lastFailureTime,
      isOpen: this.isOpen(),
    };
  }

  /**
   * Reset the circuit breaker
   */
  reset() {
    this.clearResetTimer();
    this.failures = 0;
    this.successes = 0;
    this.state = CIRCUIT_STATE.CLOSED;
    this.lastFailureTime = null;
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.clearResetTimer();
  }
}
