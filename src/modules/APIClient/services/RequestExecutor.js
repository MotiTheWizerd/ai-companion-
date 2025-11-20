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
   * Execute HTTP request. Detects if running in background (no window) or page context.
   * @param {Object} request - Request configuration
   * @returns {Promise<Object>} - Response data
   */
  async execute(request) {
    const { method, endpoint, data, headers = {} } = request;
    const url = this.buildURL(endpoint);
    const isBackground = typeof window === 'undefined';

    if (isBackground) {
      // Direct fetch in background (no CSP restrictions)
      const options = this.buildOptions(method, data, headers);
      const controller = new AbortController();
      const timeoutId = this.setupTimeout(controller);
      try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timeoutId);
        return await this.handleResponse(response);
      } catch (error) {
        clearTimeout(timeoutId);
        throw this.handleError(error);
      }
    } else {
      // Page context: use bridge via window.postMessage
      return new Promise((resolve, reject) => {
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const responseHandler = (event) => {
          if (event.source !== window) return;
          if (!event.data || event.data.source !== 'chatgpt-extension-response') return;
          if (event.data.requestId !== requestId) return;
          window.removeEventListener('message', responseHandler);
          clearTimeout(timeoutId);
          if (event.data.success) {
            resolve(event.data.data);
          } else {
            const err = new Error(event.data.error || 'Request failed');
            err.status = event.data.status;
            reject(this.handleError(err));
          }
        };
        window.addEventListener('message', responseHandler);
        const timeoutId = setTimeout(() => {
          window.removeEventListener('message', responseHandler);
          const timeoutError = new Error(`Request timeout after ${this.timeout}ms`);
          timeoutError.name = 'TimeoutError';
          reject(timeoutError);
        }, this.timeout);
        // Send request to loader (which forwards to background)
        window.postMessage({
          source: 'chatgpt-extension',
          type: 'API_REQUEST',
          requestId,
          request: { method, endpoint, data, headers },
        }, '*');
      });
    }
  }

  /**
   * Build fetch options for background requests.
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
    if (data && ['POST', 'PUT', 'PATCH'].includes(options.method)) {
      options.body = JSON.stringify(data);
    }
    return options;
  }

  /**
   * Setup request timeout using AbortController.
   */
  setupTimeout(controller) {
    return setTimeout(() => {
      controller.abort();
    }, this.timeout);
  }

  /**
   * Handle HTTP response (background only).
   */
  async handleResponse(response) {
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
      error.status = response.status;
      error.statusText = response.statusText;
      try {
        error.body = await response.json();
      } catch {
        error.body = await response.text();
      }
      throw error;
    }
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    if (response.status === 204) {
      return null;
    }
    return await response.text();
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
