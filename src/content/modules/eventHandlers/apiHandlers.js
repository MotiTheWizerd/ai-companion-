/**
 * API Event Handlers
 * Handle API request lifecycle events
 *
 * NOTE: We no longer persist API request data to localStorage to prevent
 * QuotaExceededError. All data is synced to the server instead.
 * These handlers now only provide logging for debugging.
 */

import { Logger } from "../utils/logger.js";

/**
 * Handle API request queued event
 * @param {Object} data - Event data
 * @param {Object} managers - Injected managers
 */
export function handleAPIRequestQueued(data, managers) {
  const { requestId, request } = data;
  Logger.api(
    `Request queued: ${request.method} ${request.endpoint} [${requestId}]`,
  );
}

/**
 * Handle API request start event
 * @param {Object} data - Event data
 * @param {Object} managers - Injected managers
 */
export function handleAPIRequestStart(data, managers) {
  const { requestId, request } = data;
  Logger.api(
    `Request started: ${request.method} ${request.endpoint} [${requestId}]`,
  );
}

/**
 * Handle API request success event
 * @param {Object} data - Event data
 * @param {Object} managers - Injected managers
 */
export function handleAPIRequestSuccess(data, managers) {
  const { requestId, request } = data;
  Logger.api(
    `Request succeeded: ${request.method} ${request.endpoint} [${requestId}]`,
  );
}

/**
 * Handle API request failed event
 * @param {Object} data - Event data
 * @param {Object} managers - Injected managers
 */
export function handleAPIRequestFailed(data, managers) {
  const { requestId, request, error } = data;
  Logger.api(
    `Request failed: ${request.method} ${request.endpoint} - ${error.message} [${requestId}]`,
  );
}

/**
 * Handle API request retry event
 * @param {Object} data - Event data
 * @param {Object} managers - Injected managers
 */
export function handleAPIRequestRetry(data, managers) {
  const { requestId, request, error, nextAttempt } = data;
  Logger.api(
    `Request retry: ${request.method} ${request.endpoint} - Attempt ${nextAttempt} [${requestId}]`,
  );
}

/**
 * Handle circuit breaker open event
 * @param {Object} data - Event data
 * @param {Object} managers - Injected managers
 */
export function handleAPICircuitOpen(data, managers) {
  const { failures, threshold } = data;
  Logger.api(`Circuit breaker OPEN - Failures: ${failures}/${threshold}`);
  Logger.extension("API temporarily unavailable - Circuit breaker activated");
}

/**
 * Handle circuit breaker closed event
 * @param {Object} data - Event data
 * @param {Object} managers - Injected managers
 */
export function handleAPICircuitClosed(data, managers) {
  Logger.api("Circuit breaker CLOSED - Service restored");
  Logger.extension("API service restored");
}

/**
 * Handle sync start event
 * @param {Object} data - Event data
 * @param {Object} managers - Injected managers
 */
export function handleAPISyncStart(data, managers) {
  const { conversationId, syncType } = data;
  Logger.api(`Sync started: ${syncType} for conversation ${conversationId}`);
}

/**
 * Handle sync complete event
 * @param {Object} data - Event data
 * @param {Object} managers - Injected managers
 */
export function handleAPISyncComplete(data, managers) {
  const { conversationId, syncType } = data;
  Logger.api(`Sync completed: ${syncType} for conversation ${conversationId}`);
}

/**
 * Handle sync error event
 * @param {Object} data - Event data
 * @param {Object} managers - Injected managers
 */
export function handleAPISyncError(data, managers) {
  const { conversationId, syncType, error } = data;
  Logger.api(
    `Sync error: ${syncType} for conversation ${conversationId} - ${error.message}`,
  );
}
