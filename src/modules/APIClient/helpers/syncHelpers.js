/**
 * Sync API Helper Utilities
 * Functions for synchronizing conversation data
 */

import { eventBus } from '../../../content/core/eventBus.js';
import { EVENTS } from '../../../content/core/constants.js';
import { RequestBuilder } from '../endpoints.js';

/**
 * Perform full sync of conversation
 * @param {Object} conversationData - Full conversation data
 * @returns {string} - Request ID
 */
export function syncFull(conversationData) {
  const request = RequestBuilder.syncFull(conversationData);

  eventBus.emit(EVENTS.API_SYNC_START, {
    conversationId: conversationData.conversationId,
    syncType: 'full',
  });

  eventBus.emit(EVENTS.API_REQUEST, request);

  return request;
}

/**
 * Perform incremental sync
 * @param {Object} changes - Changes to sync
 * @returns {string} - Request ID
 */
export function syncIncremental(changes) {
  const request = RequestBuilder.syncIncremental(changes);

  eventBus.emit(EVENTS.API_SYNC_START, {
    conversationId: changes.conversationId,
    syncType: 'incremental',
  });

  eventBus.emit(EVENTS.API_REQUEST, request);

  return request;
}
