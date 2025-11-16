/**
 * UrlBuilder Module
 * Utilities for URL construction and query parameter handling
 */

/**
 * UrlBuilder class
 * Handles URL building with path params and query strings
 */
export class UrlBuilder {
  /**
   * Build URL path with parameter interpolation
   * @param {string} path - Path template with :params
   * @param {Object} params - Parameters to inject
   * @returns {string} - Built path
   * @example
   * buildPath('/api/users/:id', { id: '123' })
   * // => '/api/users/123'
   */
  static buildPath(path, params = {}) {
    let builtPath = path;

    Object.entries(params).forEach(([key, value]) => {
      const encodedValue = encodeURIComponent(value);
      builtPath = builtPath.replace(`:${key}`, encodedValue);
    });

    return builtPath;
  }

  /**
   * Build query string from object
   * @param {Object} params - Query parameters
   * @param {Object} options - Build options
   * @returns {string} - Query string (without leading ?)
   * @example
   * buildQueryString({ page: 1, limit: 10 })
   * // => 'page=1&limit=10'
   */
  static buildQueryString(params = {}, options = {}) {
    const { skipNull = true, skipEmpty = true, encodeArrays = true } = options;

    const entries = Object.entries(params).filter(([_, value]) => {
      if (skipNull && value === null) return false;
      if (skipNull && value === undefined) return false;
      if (skipEmpty && value === '') return false;
      return true;
    });

    const queryParams = new URLSearchParams();

    entries.forEach(([key, value]) => {
      if (Array.isArray(value)) {
        if (encodeArrays) {
          queryParams.append(key, JSON.stringify(value));
        } else {
          value.forEach(item => queryParams.append(key, item));
        }
      } else if (typeof value === 'object') {
        queryParams.append(key, JSON.stringify(value));
      } else {
        queryParams.append(key, String(value));
      }
    });

    return queryParams.toString();
  }

  /**
   * Build full URL with path params and query string
   * @param {string} path - Path template
   * @param {Object} pathParams - Path parameters
   * @param {Object} queryParams - Query parameters
   * @returns {string} - Complete URL
   * @example
   * buildUrl('/api/users/:id', { id: '123' }, { include: 'posts' })
   * // => '/api/users/123?include=posts'
   */
  static buildUrl(path, pathParams = {}, queryParams = {}) {
    const builtPath = this.buildPath(path, pathParams);
    const queryString = this.buildQueryString(queryParams);

    return queryString ? `${builtPath}?${queryString}` : builtPath;
  }

  /**
   * Parse path parameters from template
   * @param {string} path - Path template
   * @returns {string[]} - Array of parameter names
   * @example
   * extractParams('/api/users/:id/posts/:postId')
   * // => ['id', 'postId']
   */
  static extractParams(path) {
    const matches = path.match(/:(\w+)/g);
    return matches ? matches.map(match => match.substring(1)) : [];
  }

  /**
   * Validate that all required path params are provided
   * @param {string} path - Path template
   * @param {Object} params - Provided parameters
   * @throws {Error} - If required params are missing
   */
  static validateParams(path, params = {}) {
    const required = this.extractParams(path);
    const missing = required.filter(param => !(param in params));

    if (missing.length > 0) {
      throw new Error(
        `Missing required path parameters: ${missing.join(', ')}`
      );
    }
  }
}
