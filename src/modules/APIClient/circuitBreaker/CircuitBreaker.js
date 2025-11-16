/**
 * CircuitBreaker Module (Refactored)
 * Event-driven circuit breaker with pluggable strategies
 */

import { CircuitState, CIRCUIT_STATE } from './CircuitState.js';
import { CircuitMetrics } from './CircuitMetrics.js';
import { EventEmitter, CIRCUIT_EVENTS } from './CircuitBreakerEvents.js';
import { CircuitBreakerConfig } from './CircuitBreakerConfig.js';

/**
 * CircuitBreaker class
 * Orchestrates state, metrics, and recovery strategies
 */
export class CircuitBreaker extends EventEmitter {
  constructor(config = {}) {
    super();

    // Validate and create configuration
    const validatedConfig = CircuitBreakerConfig.create(config);
    CircuitBreakerConfig.validate(validatedConfig);

    this.config = validatedConfig;

    // Initialize modules
    this.state = new CircuitState(CIRCUIT_STATE.CLOSED);
    this.metrics = new CircuitMetrics({
      threshold: this.config.threshold,
      windowSize: this.config.windowSize,
    });
    this.recoveryStrategy = CircuitBreakerConfig.getRecoveryStrategy(
      this.config.recoveryStrategy,
      this.config
    );

    // Track consecutive circuit opens for adaptive strategies
    this.consecutiveOpens = 0;
    this.resetTimer = null;
  }

  /**
   * Record a successful request
   */
  recordSuccess() {
    this.metrics.recordSuccess();

    this.emit(CIRCUIT_EVENTS.SUCCESS_RECORDED, {
      consecutiveSuccesses: this.metrics.consecutiveSuccesses,
    });

    // If in half-open state, success closes the circuit
    if (this.state.isHalfOpen()) {
      this.close('Success in half-open state');
    } else if (this.state.isClosed()) {
      // Reset consecutive opens on success
      this.consecutiveOpens = 0;
    }
  }

  /**
   * Record a failed request
   * @returns {boolean} - True if circuit opened
   */
  recordFailure() {
    this.metrics.recordFailure();

    this.emit(CIRCUIT_EVENTS.FAILURE_RECORDED, {
      consecutiveFailures: this.metrics.consecutiveFailures,
    });

    // If in half-open state, failure reopens the circuit
    if (this.state.isHalfOpen()) {
      this.open('Failure in half-open state');
      return true;
    }

    // Check if threshold reached in closed state
    if (this.state.isClosed() && this.metrics.isThresholdReached()) {
      this.emit(CIRCUIT_EVENTS.THRESHOLD_REACHED, {
        failures: this.metrics.consecutiveFailures,
        threshold: this.config.threshold,
      });
      this.open('Threshold reached');
      return true;
    }

    return false;
  }

  /**
   * Open the circuit
   * @param {string} reason - Reason for opening
   */
  open(reason = '') {
    if (this.state.isOpen()) return;

    const previousState = this.state.getState();
    this.state.transition(CIRCUIT_STATE.OPEN, reason);
    this.consecutiveOpens++;

    this.emit(CIRCUIT_EVENTS.STATE_CHANGE, {
      from: previousState,
      to: CIRCUIT_STATE.OPEN,
      reason,
    });

    this.emit(CIRCUIT_EVENTS.OPENED, {
      failures: this.metrics.consecutiveFailures,
      consecutiveOpens: this.consecutiveOpens,
    });

    this.scheduleHalfOpen();
  }

  /**
   * Close the circuit
   * @param {string} reason - Reason for closing
   */
  close(reason = '') {
    if (this.state.isClosed()) return;

    const previousState = this.state.getState();
    this.state.transition(CIRCUIT_STATE.CLOSED, reason);
    this.metrics.resetFailures();
    this.clearResetTimer();

    this.emit(CIRCUIT_EVENTS.STATE_CHANGE, {
      from: previousState,
      to: CIRCUIT_STATE.CLOSED,
      reason,
    });

    this.emit(CIRCUIT_EVENTS.CLOSED, {
      reason,
    });
  }

  /**
   * Half-open the circuit
   * @param {string} reason - Reason for half-opening
   */
  halfOpen(reason = 'Recovery timeout elapsed') {
    if (this.state.isHalfOpen()) return;

    const previousState = this.state.getState();
    this.state.transition(CIRCUIT_STATE.HALF_OPEN, reason);

    this.emit(CIRCUIT_EVENTS.STATE_CHANGE, {
      from: previousState,
      to: CIRCUIT_STATE.HALF_OPEN,
      reason,
    });

    this.emit(CIRCUIT_EVENTS.HALF_OPENED, {
      reason,
    });
  }

  /**
   * Schedule transition to half-open state
   */
  scheduleHalfOpen() {
    this.clearResetTimer();

    // Check if recovery should be attempted
    const context = this.getContext();
    if (!this.recoveryStrategy.shouldAttemptRecovery(context)) {
      // Reschedule with longer timeout
      this.resetTimer = setTimeout(() => this.scheduleHalfOpen(), this.config.timeout);
      return;
    }

    // Calculate timeout using recovery strategy
    const timeout = this.recoveryStrategy.calculateTimeout(context);

    this.resetTimer = setTimeout(() => {
      this.halfOpen();
    }, timeout);
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
    return !this.state.isOpen();
  }

  /**
   * Get current state
   * @returns {string}
   */
  getState() {
    return this.state.getState();
  }

  /**
   * Check if circuit is open
   * @returns {boolean}
   */
  isOpen() {
    return this.state.isOpen();
  }

  /**
   * Check if circuit is closed
   * @returns {boolean}
   */
  isClosed() {
    return this.state.isClosed();
  }

  /**
   * Check if circuit is half-open
   * @returns {boolean}
   */
  isHalfOpen() {
    return this.state.isHalfOpen();
  }

  /**
   * Get context for recovery strategy
   * @returns {Object}
   */
  getContext() {
    return {
      failures: this.metrics.failures,
      successes: this.metrics.successes,
      consecutiveOpens: this.consecutiveOpens,
      metrics: this.metrics,
      state: this.state,
    };
  }

  /**
   * Get comprehensive statistics
   * @returns {Object}
   */
  getStats() {
    return {
      state: this.state.getState(),
      ...this.metrics.getStats(),
      threshold: this.config.threshold,
      timeout: this.config.timeout,
      consecutiveOpens: this.consecutiveOpens,
      stateHistory: this.state.getHistory(),
    };
  }

  /**
   * Reset the circuit breaker
   */
  reset() {
    this.clearResetTimer();
    this.state.reset();
    this.metrics.reset();
    this.consecutiveOpens = 0;

    this.emit(CIRCUIT_EVENTS.RESET, {
      timestamp: Date.now(),
    });
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.clearResetTimer();
    this.removeAllListeners();
  }
}

// Re-export for convenience
export { CIRCUIT_STATE } from './CircuitState.js';
export { CIRCUIT_EVENTS } from './CircuitBreakerEvents.js';
