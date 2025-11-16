/**
 * Health Request Factory
 * Builds requests for health endpoints
 */

import { ENDPOINTS } from '../EndpointRegistry.js';
import { BaseRequestFactory } from './BaseRequestFactory.js';

/**
 * HealthRequestFactory class
 * Handles health check operations
 */
export class HealthRequestFactory extends BaseRequestFactory {
  /**
   * Health check request
   * @returns {Object} - Request object
   */
  static check() {
    return this.buildRequest(ENDPOINTS.HEALTH.CHECK);
  }
}
