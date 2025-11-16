/**
 * Analytics and Health Check Helper Utilities
 * Functions for tracking events and monitoring API health
 */

import { eventBus } from '../../../content/core/eventBus.js';
import { EVENTS } from '../../../content/core/constants.js';
import { RequestBuilder } from '../endpoints.js';

/**
 * Track an analytics event
 * @param {string} eventName - Event name
 * @param {Object} eventData - Event data
 * @returns {string} - Request ID
 */
export function trackEvent(eventName, eventData) {
  const request = RequestBuilder.trackEvent(eventName, eventData);

  eventBus.emit(EVENTS.API_REQUEST, request);

  return request;
}

/**
 * Perform health check
 * @returns {string} - Request ID
 */
export function healthCheck() {
  const request = RequestBuilder.healthCheck();

  eventBus.emit(EVENTS.API_REQUEST, request);

  return request;
}
