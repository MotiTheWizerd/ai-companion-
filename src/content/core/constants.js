/**
 * Application constants and configuration
 * Centralized location for all constant values used across the extension
 */

import { USER_CONFIG } from '../../configuration/index.js';

/**
 * Event names used throughout the event bus system
 */
export const EVENTS = {
  // Message events
  MESSAGE_INPUT: 'message:input',
  MESSAGE_MARKER: 'message:marker',
  MESSAGE_METADATA: 'message:metadata',

  // Stream events
  STREAM_START: 'stream:start',
  STREAM_TEXT: 'stream:text',
  STREAM_COMPLETE: 'stream:complete',
  STREAM_DONE: 'stream:done',

  // System events
  EXTENSION_READY: 'extension:ready',
  EXTENSION_ERROR: 'extension:error',

  // API events
  API_REQUEST: 'api:request',
  API_REQUEST_QUEUED: 'api:request:queued',
  API_REQUEST_START: 'api:request:start',
  API_REQUEST_SUCCESS: 'api:request:success',
  API_REQUEST_FAILED: 'api:request:failed',
  API_REQUEST_RETRY: 'api:request:retry',
  API_PROCESS_QUEUE: 'api:process:queue',
  API_CIRCUIT_OPEN: 'api:circuit:open',
  API_CIRCUIT_CLOSED: 'api:circuit:closed',
  API_SYNC_START: 'api:sync:start',
  API_SYNC_COMPLETE: 'api:sync:complete',
  API_SYNC_ERROR: 'api:sync:error',

  // Chat History events
  CONVERSATION_RESUME: 'conversation:resume',
  CHAT_HISTORY_CAPTURE: 'chat:history:capture',
  CHAT_HISTORY_CAPTURED: 'chat:history:captured',
  CLAUDE_API_RESPONSE: 'claude:api:response',
  CHATGPT_API_RESPONSE: 'chatgpt:api:response',
};

/**
 * Message types for conversation tracking
 */
export const MESSAGE_TYPES = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system',
};

/**
 * Log prefixes for consistent logging
 */
export const LOG_PREFIXES = {
  EXTENSION: '[ChatGPT Extension]',
  MESSAGE: '[Message]',
  STREAM: '[Stream]',
  STORAGE: '[Storage]',
  API: '[Public API]',
  EVENT: '[Event]',
};

/**
 * API configuration
 */
export const API_CONFIG = {
  CHATGPT_ENDPOINT: '/conversation',
  STORAGE_KEY: 'chatgpt_conversations',

  // Backend API configuration
  BASE_URL: 'http://localhost:8000',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  MAX_CONCURRENT: 5,
  AUTO_SYNC: true,

  // User configuration (imported from userSettings.json via configuration/index.js)
  USER_ID: USER_CONFIG.USER_ID,
  // PROJECT_ID removed - now provider-specific (see provider configs)
};

/**
 * Default settings
 */
export const DEFAULTS = {
  AUTO_SAVE: true,
  LOG_CONVERSATION: true,
};
