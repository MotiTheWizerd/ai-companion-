/**
 * Base Request Factory
 * Provides common request building functionality for all request factories
 */

import { UrlBuilder } from '../UrlBuilder.js';

/**
 * BaseRequestFactory class
 * Base class with shared request building methods
 */
export class BaseRequestFactory {
  /**
   * Add timestamp to data
   * @param {Object} data - Request data
   * @returns {Object} - Data with timestamp
   */
  static addTimestamp(data) {
    return {
      ...data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Add metadata to data
   * @param {Object} data - Request data
   * @param {Object} additionalMetadata - Additional metadata
   * @returns {Object} - Data with metadata
   */
  static addMetadata(data, additionalMetadata = {}) {
    return {
      ...data,
      metadata: {
        source: 'chatgpt-extension',
        createdAt: new Date().toISOString(),
        ...additionalMetadata,
      },
    };
  }

  /**
   * Build request object
   * @param {Object} endpoint - Endpoint config
   * @param {Object} options - Request options
   * @returns {Object} - Request object
   */
  static buildRequest(endpoint, options = {}) {
    const { pathParams, queryParams, data, headers } = options;

    const path = pathParams
      ? UrlBuilder.buildPath(endpoint.path, pathParams)
      : endpoint.path;

    const url = queryParams
      ? UrlBuilder.buildUrl(path, {}, queryParams)
      : path;

    return {
      method: endpoint.method,
      endpoint: url,
      ...(data && { data }),
      ...(headers && { headers }),
    };
  }
}
