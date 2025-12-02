/**
 * Event Handler Registry
 * Central mapping of events to their handler functions
 * Single source of truth for all event subscriptions
 */

import { EVENTS } from '../../core/constants.js';

import { handleMessageInput } from './messageHandlers.js';

import {
  handleStreamStart,
  handleStreamText,
  handleStreamComplete,
} from './streamHandlers.js';

import {
  handleMessageMarker,
  handleMessageMetadata,
} from './markerHandlers.js';

import {
  handleAPIRequestQueued,
  handleAPIRequestStart,
  handleAPIRequestSuccess,
  handleAPIRequestFailed,
  handleAPIRequestRetry,
  handleAPICircuitOpen,
  handleAPICircuitClosed,
  handleAPISyncStart,
  handleAPISyncComplete,
  handleAPISyncError,
} from './apiHandlers.js';

import {
  handleConversationResume,
  handleChatHistoryCapture,
  handleClaudeApiResponse,
} from './chatHistoryHandlers.js';

import { handleImportChat } from './chatImportHandlers.js';
import { handleEmojiSelected } from './uiHandlers.js';

/**
 * Handler Registry
 * Maps event names to their corresponding handler functions
 *
 * Usage:
 * - To add a new handler: Import it and add to this object
 * - To remove a handler: Delete the entry
 * - To change event name: Update EVENTS constant, this stays unchanged
 */
export const HANDLER_REGISTRY = {
  // Message events
  [EVENTS.MESSAGE_INPUT]: handleMessageInput,
  [EVENTS.MESSAGE_MARKER]: handleMessageMarker,
  [EVENTS.MESSAGE_METADATA]: handleMessageMetadata,

  // Stream events
  [EVENTS.STREAM_START]: handleStreamStart,
  [EVENTS.STREAM_TEXT]: handleStreamText,
  [EVENTS.STREAM_COMPLETE]: handleStreamComplete,

  // API events
  [EVENTS.API_REQUEST_QUEUED]: handleAPIRequestQueued,
  [EVENTS.API_REQUEST_START]: handleAPIRequestStart,
  [EVENTS.API_REQUEST_SUCCESS]: handleAPIRequestSuccess,
  [EVENTS.API_REQUEST_FAILED]: handleAPIRequestFailed,
  [EVENTS.API_REQUEST_RETRY]: handleAPIRequestRetry,
  [EVENTS.API_CIRCUIT_OPEN]: handleAPICircuitOpen,
  [EVENTS.API_CIRCUIT_CLOSED]: handleAPICircuitClosed,
  [EVENTS.API_SYNC_START]: handleAPISyncStart,
  [EVENTS.API_SYNC_COMPLETE]: handleAPISyncComplete,
  [EVENTS.API_SYNC_ERROR]: handleAPISyncError,

  // Chat Import events (only settings-triggered import)
  'import:chat': handleImportChat,
  'emoji:selected': handleEmojiSelected,
};
