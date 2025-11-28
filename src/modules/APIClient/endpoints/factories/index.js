/**
 * Request Factories
 * Central export point for all request factory classes
 */

// Import all factory classes
export { BaseRequestFactory } from './BaseRequestFactory.js';
export { ConversationRequestFactory } from './ConversationRequestFactory.js';
export { MessageRequestFactory } from './MessageRequestFactory.js';
export { SyncRequestFactory } from './SyncRequestFactory.js';
export { AnalyticsRequestFactory } from './AnalyticsRequestFactory.js';
export { HealthRequestFactory } from './HealthRequestFactory.js';
export { MemoryRequestFactory } from './MemoryRequestFactory.js';
export { ProjectRequestFactory } from './ProjectRequestFactory.js';

// Import factories for RequestBuilder
import { ConversationRequestFactory } from './ConversationRequestFactory.js';
import { MessageRequestFactory } from './MessageRequestFactory.js';
import { SyncRequestFactory } from './SyncRequestFactory.js';
import { AnalyticsRequestFactory } from './AnalyticsRequestFactory.js';
import { HealthRequestFactory } from './HealthRequestFactory.js';
import { MemoryRequestFactory } from './MemoryRequestFactory.js';
import { ProjectRequestFactory } from './ProjectRequestFactory.js';

/**
 * Unified RequestBuilder
 * Provides a backwards compatible interface for all request building operations
 * This maintains compatibility with code using the old RequestFactory.js
 */
export const RequestBuilder = {
  // Conversation methods
  createConversation: (data) => ConversationRequestFactory.create(data),
  getConversation: (id) => ConversationRequestFactory.get(id),
  updateConversation: (id, updates) => ConversationRequestFactory.update(id, updates),
  listConversations: (options) => ConversationRequestFactory.list(options),
  deleteConversation: (id) => ConversationRequestFactory.delete(id),

  // Message methods
  addMessage: (convId, message) => MessageRequestFactory.create(convId, message),
  getMessage: (id) => MessageRequestFactory.get(id),
  updateMessage: (id, updates) => MessageRequestFactory.update(id, updates),
  listMessages: (convId, options) => MessageRequestFactory.list(convId, options),

  // Sync methods
  syncFull: (data) => SyncRequestFactory.full(data),
  syncIncremental: (changes) => SyncRequestFactory.incremental(changes),
  syncStatus: (options) => SyncRequestFactory.status(options),

  // Analytics methods
  trackEvent: (name, data) => AnalyticsRequestFactory.trackEvent(name, data),
  getMetrics: (options) => AnalyticsRequestFactory.getMetrics(options),

  // Health methods
  healthCheck: () => HealthRequestFactory.check(),

  // Memory methods
  searchMemory: (data) => MemoryRequestFactory.search(data),

  // Project methods
  getProjectsByUser: (userId) => ProjectRequestFactory.getByUser(userId),
};
