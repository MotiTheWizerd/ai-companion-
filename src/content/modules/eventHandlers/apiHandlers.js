/**
 * API Event Handlers
 * Handle API request lifecycle events
 */

import { Logger } from '../utils/logger.js';

/**
 * Handle API request queued event
 * @param {Object} data - Event data
 * @param {Object} managers - Injected managers
 */
export function handleAPIRequestQueued(data, managers) {
  const { requestId, request } = data;
  const { storageManager } = managers;

  Logger.api(`Request queued: ${request.method} ${request.endpoint} [${requestId}]`);

  // Store request status for tracking
  storageManager.setItem(`api_request_${requestId}`, {
    status: 'queued',
    request,
    queuedAt: Date.now(),
  });
}

/**
 * Handle API request start event
 * @param {Object} data - Event data
 * @param {Object} managers - Injected managers
 */
export function handleAPIRequestStart(data, managers) {
  const { requestId, request } = data;
  const { storageManager } = managers;

  Logger.api(`Request started: ${request.method} ${request.endpoint} [${requestId}]`);

  // Update request status
  storageManager.updateItem(`api_request_${requestId}`, {
    status: 'in_flight',
    startedAt: Date.now(),
  });
}

/**
 * Handle API request success event
 * @param {Object} data - Event data
 * @param {Object} managers - Injected managers
 */
export function handleAPIRequestSuccess(data, managers) {
  const { requestId, request, response } = data;
  const { storageManager, conversationManager } = managers;

  Logger.api(`Request succeeded: ${request.method} ${request.endpoint} [${requestId}]`);

  // Update request status
  storageManager.updateItem(`api_request_${requestId}`, {
    status: 'success',
    response,
    completedAt: Date.now(),
  });

  // Update conversation sync status if applicable
  if (request.endpoint.includes('/conversations')) {
    const conversationId = request.data?.conversationId;
    if (conversationId) {
      conversationManager.updateMetadata(conversationId, {
        lastSyncedAt: new Date().toISOString(),
        syncStatus: 'synced',
      });
    }
  }

  // Clean up old request data after 5 minutes
  setTimeout(() => {
    storageManager.removeItem(`api_request_${requestId}`);
  }, 5 * 60 * 1000);
}

/**
 * Handle API request failed event
 * @param {Object} data - Event data
 * @param {Object} managers - Injected managers
 */
export function handleAPIRequestFailed(data, managers) {
  const { requestId, request, error } = data;
  const { storageManager, conversationManager } = managers;

  Logger.api(`Request failed: ${request.method} ${request.endpoint} - ${error.message} [${requestId}]`);

  // Update request status
  storageManager.updateItem(`api_request_${requestId}`, {
    status: 'failed',
    error: {
      message: error.message,
      stack: error.stack,
    },
    completedAt: Date.now(),
  });

  // Update conversation sync status if applicable
  if (request.endpoint.includes('/conversations')) {
    const conversationId = request.data?.conversationId;
    if (conversationId) {
      conversationManager.updateMetadata(conversationId, {
        syncStatus: 'error',
        lastSyncError: error.message,
        lastSyncAttempt: new Date().toISOString(),
      });
    }
  }

  // Store failed request for retry queue
  storageManager.addToList('failed_api_requests', {
    requestId,
    request,
    error: error.message,
    failedAt: Date.now(),
  });
}

/**
 * Handle API request retry event
 * @param {Object} data - Event data
 * @param {Object} managers - Injected managers
 */
export function handleAPIRequestRetry(data, managers) {
  const { requestId, request, error, nextAttempt } = data;
  const { storageManager } = managers;

  Logger.api(`Request retry: ${request.method} ${request.endpoint} - Attempt ${nextAttempt} [${requestId}]`);

  // Update request status
  storageManager.updateItem(`api_request_${requestId}`, {
    status: 'retrying',
    nextAttempt,
    lastError: error.message,
    retriedAt: Date.now(),
  });
}

/**
 * Handle circuit breaker open event
 * @param {Object} data - Event data
 * @param {Object} managers - Injected managers
 */
export function handleAPICircuitOpen(data, managers) {
  const { failures, threshold } = data;
  const { storageManager } = managers;

  Logger.api(`Circuit breaker OPEN - Failures: ${failures}/${threshold}`);

  // Store circuit breaker state
  storageManager.setItem('api_circuit_breaker', {
    state: 'open',
    failures,
    threshold,
    openedAt: Date.now(),
  });

  // Notify user (could trigger UI notification)
  Logger.extension('API temporarily unavailable - Circuit breaker activated');
}

/**
 * Handle circuit breaker closed event
 * @param {Object} data - Event data
 * @param {Object} managers - Injected managers
 */
export function handleAPICircuitClosed(data, managers) {
  const { storageManager } = managers;

  Logger.api('Circuit breaker CLOSED - Service restored');

  // Update circuit breaker state
  storageManager.updateItem('api_circuit_breaker', {
    state: 'closed',
    closedAt: Date.now(),
  });

  Logger.extension('API service restored');
}

/**
 * Handle sync start event
 * @param {Object} data - Event data
 * @param {Object} managers - Injected managers
 */
export function handleAPISyncStart(data, managers) {
  const { conversationId, syncType } = data;
  const { conversationManager } = managers;

  Logger.api(`Sync started: ${syncType} for conversation ${conversationId}`);

  conversationManager.updateMetadata(conversationId, {
    syncStatus: 'syncing',
    syncType,
    syncStartedAt: new Date().toISOString(),
  });
}

/**
 * Handle sync complete event
 * @param {Object} data - Event data
 * @param {Object} managers - Injected managers
 */
export function handleAPISyncComplete(data, managers) {
  const { conversationId, syncType, result } = data;
  const { conversationManager } = managers;

  Logger.api(`Sync completed: ${syncType} for conversation ${conversationId}`);

  conversationManager.updateMetadata(conversationId, {
    syncStatus: 'synced',
    lastSyncedAt: new Date().toISOString(),
    syncType,
    syncResult: result,
  });
}

/**
 * Handle sync error event
 * @param {Object} data - Event data
 * @param {Object} managers - Injected managers
 */
export function handleAPISyncError(data, managers) {
  const { conversationId, syncType, error } = data;
  const { conversationManager } = managers;

  Logger.api(`Sync error: ${syncType} for conversation ${conversationId} - ${error.message}`);

  conversationManager.updateMetadata(conversationId, {
    syncStatus: 'error',
    lastSyncError: error.message,
    lastSyncAttempt: new Date().toISOString(),
    syncType,
  });
}
