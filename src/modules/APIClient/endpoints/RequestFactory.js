/**
 * RequestFactory Module
 *
 * DEPRECATED: This file is maintained for backward compatibility.
 * Please use the modular factories from './factories/' directory instead.
 *
 * New structure:
 * - factories/BaseRequestFactory.js - Common request building utilities
 * - factories/ConversationRequestFactory.js - Conversation CRUD operations
 * - factories/MessageRequestFactory.js - Message operations
 * - factories/SyncRequestFactory.js - Sync operations
 * - factories/AnalyticsRequestFactory.js - Analytics tracking
 * - factories/HealthRequestFactory.js - Health checks
 * - factories/index.js - Main export file with RequestBuilder
 */

export * from './factories/index.js';
