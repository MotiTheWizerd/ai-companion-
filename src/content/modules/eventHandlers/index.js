/**
 * Event handlers index
 * Exports all event handler functions
 */

export { handleMessageInput } from './messageHandlers.js';
export { handleStreamStart, handleStreamText, handleStreamComplete } from './streamHandlers.js';
export { handleMessageMarker, handleMessageMetadata } from './markerHandlers.js';

export {
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

export {
  handleConversationResume,
  handleChatHistoryCapture,
  handleClaudeApiResponse,
} from './chatHistoryHandlers.js';
