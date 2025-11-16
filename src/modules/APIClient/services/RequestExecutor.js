/**
 * RequestExecutor Module
 * Handles HTTP request execution with timeout
 */

/**
 * RequestExecutor class
 * Pure HTTP fetch logic with timeout handling
 */
export class RequestExecutor {
  constructor(config = {}) {
    this.baseURL = config.baseURL || 'http://localhost:3000';
    this.timeout = config.timeout || 30000;
    this.defaultHeaders = config.headers || {};
  }

  /**
   * Execute HTTP request
   * @param {Object} request - Request configuration
   * @returns {Promise<Object>} - Response data
   */
  async execute(request) {
    const { method, endpoint, data, headers = {} } = request;

    const url = this.buildURL(endpoint);
    const options = this.buildOptions(method, data, headers);

    const controller = new AbortController();
    const timeoutId = this.setupTimeout(controller);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      return await this.handleResponse(response);

    } catch (error) {
      clearTimeout(timeoutId);
      throw this.handleError(error);
    }
  }

  /**
   * Build full URL from endpoint
   * @param {string} endpoint - API endpoint
   * @returns {string} - Full URL
   */
  buildURL(endpoint) {
    // Handle absolute URLs
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      return endpoint;
    }

    // Ensure endpoint starts with /
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    return `${this.baseURL}${normalizedEndpoint}`;
  }

  /**
   * Build fetch options
   * @param {string} method - HTTP method
   * @param {Object} data - Request data
   * @param {Object} headers - Custom headers
   * @returns {Object} - Fetch options
   */
  buildOptions(method, data, headers) {
    const options = {
      method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
        ...this.defaultHeaders,
        ...headers,
      },
    };

    // Add body for methods that support it
    if (data && ['POST', 'PUT', 'PATCH'].includes(options.method)) {
      options.body = JSON.stringify(data);
    }

    return options;
  }

  /**
   * Setup request timeout
   * @param {AbortController} controller - Abort controller
   * @returns {number} - Timeout ID
   */
  setupTimeout(controller) {
    return setTimeout(() => {
      controller.abort();
    }, this.timeout);
  }

  /**
   * Handle HTTP response
   * @param {Response} response - Fetch response
   * @returns {Promise<Object>} - Parsed response data
   */
  async handleResponse(response) {
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
      error.status = response.status;
      error.statusText = response.statusText;

      // Try to parse error response body
      try {
        error.body = await response.json();
      } catch {
        error.body = await response.text();
      }

      throw error;
    }

    // Handle different response types
    const contentType = response.headers.get('content-type');

    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }

    if (response.status === 204) {
      // No content
      return null;
    }

    // Default to text
    return await response.text();
  }

  /**
   * Handle request errors
   * @param {Error} error - Error object
   * @returns {Error} - Enhanced error
   */
  handleError(error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error(`Request timeout after ${this.timeout}ms`);
      timeoutError.name = 'TimeoutError';
      timeoutError.timeout = this.timeout;
      return timeoutError;
    }

    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      const networkError = new Error('Network error - Unable to reach server');
      networkError.name = 'NetworkError';
      networkError.originalError = error;
      return networkError;
    }

    return error;
  }

  /**
   * Update configuration
   * @param {Object} config - New configuration
   */
  updateConfig(config) {
    if (config.baseURL !== undefined) this.baseURL = config.baseURL;
    if (config.timeout !== undefined) this.timeout = config.timeout;
    if (config.headers !== undefined) this.defaultHeaders = config.headers;
  }

  /**
   * Get current configuration
   * @returns {Object}
   */
  getConfig() {
    return {
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: this.defaultHeaders,
    };
  }
}
