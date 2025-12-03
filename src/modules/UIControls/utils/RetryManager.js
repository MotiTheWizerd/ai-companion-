/**
 * Shared retry helper that enforces a duty cycle.
 * Runs callbacks every `delay` ms for `activeDuration` within each `cycleLength`.
 */
export class RetryManager {
  constructor({
    delay = 500,
    activeDuration = 180000,
    cycleLength = 300000,
  } = {}) {
    this.delay = delay;
    this.activeDuration = activeDuration;
    this.cycleLength = cycleLength;
    this.retryTimeout = null;
    this.cooldownTimeout = null;
    this.windowStart = null;
    this.callback = null;
  }

  /**
   * Schedule a retry attempt respecting the duty cycle.
   * @param {Function} callback
   */
  schedule(callback) {
    this.callback = callback;

    if (this.cooldownTimeout || this.retryTimeout) {
      return;
    }

    const now = Date.now();
    if (this.windowStart === null) {
      this.windowStart = now;
    }

    const elapsed = now - this.windowStart;
    if (elapsed >= this.cycleLength) {
      this.windowStart = now;
    }

    if (elapsed >= this.activeDuration) {
      const waitTime = Math.max(0, this.cycleLength - elapsed);
      this.cooldownTimeout = setTimeout(() => {
        this.cooldownTimeout = null;
        this.windowStart = null;
        if (this.callback) {
          this.schedule(this.callback);
        }
      }, waitTime || 1);
      return;
    }

    this.retryTimeout = setTimeout(() => {
      this.retryTimeout = null;
      if (this.callback) {
        this.callback();
      }
    }, this.delay);
  }

  /**
   * Cancel all scheduled retries and reset timers.
   */
  cancel() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
    if (this.cooldownTimeout) {
      clearTimeout(this.cooldownTimeout);
      this.cooldownTimeout = null;
    }
    this.windowStart = null;
    this.callback = null;
  }
}
