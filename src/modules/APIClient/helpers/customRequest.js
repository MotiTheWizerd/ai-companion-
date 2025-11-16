/**
 * Custom Request Helper Utility
 * Function for making custom API requests
 */

import { eventBus } from '../../../content/core/eventBus.js';
import { EVENTS } from '../../../content/core/constants.js';

/**
 * Custom API request
 * @param {Object} requestConfig - Custom request configuration
 * @returns {string} - Request ID
 */
export function customRequest(requestConfig) {
  eventBus.emit(EVENTS.API_REQUEST, requestConfig);

  return requestConfig;
}
