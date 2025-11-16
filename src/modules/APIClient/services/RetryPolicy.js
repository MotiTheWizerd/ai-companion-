/**
 * RetryPolicy Module
 * Implements retry logic with exponential backoff
 */

/**
 * RetryPolicy class
 * Handles retry decision and delay calculation
 */
export class RetryPolicy {
  constructor(config = {}) {
    this.maxAttempts = config.maxAttempts || 3;
    this.baseDelay = config.baseDelay || 1000;
    this.maxDelay = config.maxDelay || 30000;
    this.jitterEnabled = config.jitterEnabled !== false; // default true
  }

  /**
   * Check if request should be retried
   * @param {number} attempts - Current attempt count
   * @returns {boolean}
   */
  shouldRetry(attempts) {
    return attempts < this.maxAttempts;
  }

  /**
   * Calculate delay for next retry with exponential backoff
   * @param {number} attempt - Attempt number (1-based)
   * @returns {number} - Delay in milliseconds
   */
  calculateDelay(attempt) {
    // Exponential backoff: delay * 2^(attempt-1)
    const exponentialDelay = this.baseDelay * Math.pow(2, attempt - 1);

    // Add jitter to prevent thundering herd
    const jitter = this.jitterEnabled ? Math.random() * 1000 : 0;

    // Cap at max delay
    const delay = Math.min(exponentialDelay + jitter, this.maxDelay);

    return Math.round(delay);
  }

  /**
   * Get retry info for logging/monitoring
   * @param {number} attempts - Current attempts
   * @returns {Object}
   */
  getRetryInfo(attempts) {
    return {
      currentAttempt: attempts,
      maxAttempts: this.maxAttempts,
      shouldRetry: this.shouldRetry(attempts),
      nextDelay: this.shouldRetry(attempts) ? this.calculateDelay(attempts + 1) : null,
      attemptsRemaining: Math.max(0, this.maxAttempts - attempts),
    };
  }

  /**
   * Get configuration
   * @returns {Object}
   */
  getConfig() {
    return {
      maxAttempts: this.maxAttempts,
      baseDelay: this.baseDelay,
      maxDelay: this.maxDelay,
      jitterEnabled: this.jitterEnabled,
    };
  }

  /**
   * Update configuration
   * @param {Object} config - New configuration
   */
  updateConfig(config) {
    if (config.maxAttempts !== undefined) this.maxAttempts = config.maxAttempts;
    if (config.baseDelay !== undefined) this.baseDelay = config.baseDelay;
    if (config.maxDelay !== undefined) this.maxDelay = config.maxDelay;
    if (config.jitterEnabled !== undefined) this.jitterEnabled = config.jitterEnabled;
  }
}

/**
 * Common retry strategies
 */
export const RetryStrategies = {
  /**
   * Conservative strategy - fewer retries, longer delays
   */
  CONSERVATIVE: {
    maxAttempts: 2,
    baseDelay: 2000,
    maxDelay: 60000,
    jitterEnabled: true,
  },

  /**
   * Standard strategy - balanced approach
   */
  STANDARD: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    jitterEnabled: true,
  },

  /**
   * Aggressive strategy - more retries, shorter delays
   */
  AGGRESSIVE: {
    maxAttempts: 5,
    baseDelay: 500,
    maxDelay: 15000,
    jitterEnabled: true,
  },

  /**
   * No retry - fail fast
   */
  NO_RETRY: {
    maxAttempts: 1,
    baseDelay: 0,
    maxDelay: 0,
    jitterEnabled: false,
  },
};
