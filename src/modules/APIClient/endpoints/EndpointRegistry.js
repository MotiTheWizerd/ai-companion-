/**
 * EndpointRegistry Module
 * Centralized registry of all API endpoint definitions
 */

/**
 * Endpoint definitions organized by resource
 * Each endpoint contains: path, method, description
 */
export const ENDPOINTS = {
  // Conversation endpoints
  CONVERSATIONS: {
    CREATE: {
      path: '/api/conversations',
      method: 'POST',
      description: 'Create a new conversation',
    },
    GET: {
      path: '/api/conversations/:id',
      method: 'GET',
      description: 'Get conversation by ID',
    },
    UPDATE: {
      path: '/api/conversations/:id',
      method: 'PUT',
      description: 'Update conversation',
    },
    LIST: {
      path: '/api/conversations',
      method: 'GET',
      description: 'List all conversations',
    },
    DELETE: {
      path: '/api/conversations/:id',
      method: 'DELETE',
      description: 'Delete conversation',
    },
  },

  // Message endpoints
  MESSAGES: {
    CREATE: {
      path: '/api/conversations/:conversationId/messages',
      method: 'POST',
      description: 'Add message to conversation',
    },
    GET: {
      path: '/api/messages/:id',
      method: 'GET',
      description: 'Get message by ID',
    },
    UPDATE: {
      path: '/api/messages/:id',
      method: 'PUT',
      description: 'Update message',
    },
    LIST: {
      path: '/api/conversations/:conversationId/messages',
      method: 'GET',
      description: 'List messages in conversation',
    },
  },

  // Sync endpoints
  SYNC: {
    FULL: {
      path: '/api/sync/full',
      method: 'POST',
      description: 'Full conversation sync',
    },
    INCREMENTAL: {
      path: '/api/sync/incremental',
      method: 'POST',
      description: 'Incremental sync of changes',
    },
    STATUS: {
      path: '/api/sync/status',
      method: 'GET',
      description: 'Get sync status',
    },
  },

  // Analytics endpoints
  ANALYTICS: {
    TRACK_EVENT: {
      path: '/api/analytics/events',
      method: 'POST',
      description: 'Track analytics event',
    },
    GET_METRICS: {
      path: '/api/analytics/metrics',
      method: 'GET',
      description: 'Get usage metrics',
    },
  },

  // Health check
  HEALTH: {
    CHECK: {
      path: '/api/health',
      method: 'GET',
      description: 'Health check endpoint',
    },
  },

  // Memory endpoints
  MEMORY: {
    SEARCH: {
      path: '/conversations/fetch-memory',
      method: 'POST',
      description: 'Semantic fetch-memory for conversations',
    },
  },
};

/**
 * Get all endpoints as flat list
 * @returns {Array} - Array of endpoint objects
 */
export function getAllEndpoints() {
  const endpoints = [];

  Object.entries(ENDPOINTS).forEach(([resource, methods]) => {
    Object.entries(methods).forEach(([action, config]) => {
      endpoints.push({
        resource,
        action,
        ...config,
      });
    });
  });

  return endpoints;
}

/**
 * Find endpoint by path and method
 * @param {string} path - Endpoint path
 * @param {string} method - HTTP method
 * @returns {Object|null} - Endpoint config or null
 */
export function findEndpoint(path, method) {
  const allEndpoints = getAllEndpoints();
  return allEndpoints.find(
    ep => ep.path === path && ep.method.toUpperCase() === method.toUpperCase()
  ) || null;
}

/**
 * Get endpoints by resource
 * @param {string} resource - Resource name (e.g., 'CONVERSATIONS')
 * @returns {Object} - Resource endpoints
 */
export function getResourceEndpoints(resource) {
  return ENDPOINTS[resource] || {};
}
