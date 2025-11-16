/**
 * Analytics Request Factory
 * Builds requests for analytics endpoints
 */

import { ENDPOINTS } from '../EndpointRegistry.js';
import { BaseRequestFactory } from './BaseRequestFactory.js';

/**
 * AnalyticsRequestFactory class
 * Handles analytics and metrics tracking
 */
export class AnalyticsRequestFactory extends BaseRequestFactory {
  /**
   * Track event request
   * @param {string} eventName - Event name
   * @param {Object} eventData - Event data
   * @returns {Object} - Request object
   */
  static trackEvent(eventName, eventData = {}) {
    return this.buildRequest(ENDPOINTS.ANALYTICS.TRACK_EVENT, {
      data: this.addTimestamp({
        event: eventName,
        properties: eventData,
      }),
    });
  }

  /**
   * Get metrics request
   * @param {Object} options - Query options
   * @returns {Object} - Request object
   */
  static getMetrics(options = {}) {
    return this.buildRequest(ENDPOINTS.ANALYTICS.GET_METRICS, {
      queryParams: options,
    });
  }
}
