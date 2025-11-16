/**
 * CircuitMetrics Module
 * Tracks success/failure metrics and health statistics
 */

/**
 * CircuitMetrics class
 * Collects and analyzes circuit breaker performance metrics
 */
export class CircuitMetrics {
  constructor(config = {}) {
    this.windowSize = config.windowSize || 100; // Rolling window size
    this.threshold = config.threshold || 5;

    this.successes = 0;
    this.failures = 0;
    this.totalRequests = 0;

    // Rolling window for recent results
    this.recentResults = [];

    // Time-based tracking
    this.lastSuccessTime = null;
    this.lastFailureTime = null;
    this.firstFailureTime = null;

    // Consecutive tracking
    this.consecutiveSuccesses = 0;
    this.consecutiveFailures = 0;
  }

  /**
   * Record a successful request
   */
  recordSuccess() {
    this.successes++;
    this.totalRequests++;
    this.consecutiveSuccesses++;
    this.consecutiveFailures = 0;
    this.lastSuccessTime = Date.now();

    this.addToWindow(true);
  }

  /**
   * Record a failed request
   */
  recordFailure() {
    this.failures++;
    this.totalRequests++;
    this.consecutiveFailures++;
    this.consecutiveSuccesses = 0;
    this.lastFailureTime = Date.now();

    if (!this.firstFailureTime) {
      this.firstFailureTime = Date.now();
    }

    this.addToWindow(false);
  }

  /**
   * Add result to rolling window
   * @param {boolean} success - Whether request succeeded
   */
  addToWindow(success) {
    this.recentResults.push({
      success,
      timestamp: Date.now(),
    });

    // Maintain window size
    if (this.recentResults.length > this.windowSize) {
      this.recentResults.shift();
    }
  }

  /**
   * Calculate success rate
   * @param {number} windowSize - Optional window size (default: use all data)
   * @returns {number} - Success rate (0-1)
   */
  getSuccessRate(windowSize = null) {
    if (this.totalRequests === 0) return 1; // No data, assume healthy

    if (windowSize) {
      const recentWindow = this.recentResults.slice(-windowSize);
      const recentSuccesses = recentWindow.filter(r => r.success).length;
      return recentSuccesses / recentWindow.length;
    }

    return this.successes / this.totalRequests;
  }

  /**
   * Calculate failure rate
   * @param {number} windowSize - Optional window size
   * @returns {number} - Failure rate (0-1)
   */
  getFailureRate(windowSize = null) {
    return 1 - this.getSuccessRate(windowSize);
  }

  /**
   * Get health percentage
   * @returns {number} - Health percentage (0-100)
   */
  getHealthPercentage() {
    return Math.round(this.getSuccessRate() * 100);
  }

  /**
   * Check if threshold is reached
   * @returns {boolean}
   */
  isThresholdReached() {
    return this.consecutiveFailures >= this.threshold;
  }

  /**
   * Get recent failure count
   * @param {number} windowSize - Window size
   * @returns {number}
   */
  getRecentFailures(windowSize = this.windowSize) {
    const recentWindow = this.recentResults.slice(-windowSize);
    return recentWindow.filter(r => !r.success).length;
  }

  /**
   * Get recent success count
   * @param {number} windowSize - Window size
   * @returns {number}
   */
  getRecentSuccesses(windowSize = this.windowSize) {
    const recentWindow = this.recentResults.slice(-windowSize);
    return recentWindow.filter(r => r.success).length;
  }

  /**
   * Get time since last failure
   * @returns {number|null} - Milliseconds or null
   */
  getTimeSinceLastFailure() {
    return this.lastFailureTime ? Date.now() - this.lastFailureTime : null;
  }

  /**
   * Get time since first failure
   * @returns {number|null} - Milliseconds or null
   */
  getTimeSinceFirstFailure() {
    return this.firstFailureTime ? Date.now() - this.firstFailureTime : null;
  }

  /**
   * Get comprehensive statistics
   * @returns {Object}
   */
  getStats() {
    return {
      successes: this.successes,
      failures: this.failures,
      totalRequests: this.totalRequests,
      successRate: this.getSuccessRate(),
      failureRate: this.getFailureRate(),
      healthPercentage: this.getHealthPercentage(),
      consecutiveSuccesses: this.consecutiveSuccesses,
      consecutiveFailures: this.consecutiveFailures,
      recentSuccesses: this.getRecentSuccesses(10),
      recentFailures: this.getRecentFailures(10),
      lastSuccessTime: this.lastSuccessTime,
      lastFailureTime: this.lastFailureTime,
      timeSinceLastFailure: this.getTimeSinceLastFailure(),
    };
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.successes = 0;
    this.failures = 0;
    this.totalRequests = 0;
    this.consecutiveSuccesses = 0;
    this.consecutiveFailures = 0;
    this.recentResults = [];
    this.lastSuccessTime = null;
    this.lastFailureTime = null;
    this.firstFailureTime = null;
  }

  /**
   * Reset only failure tracking
   */
  resetFailures() {
    this.failures = 0;
    this.consecutiveFailures = 0;
    this.lastFailureTime = null;
    this.firstFailureTime = null;
  }
}
