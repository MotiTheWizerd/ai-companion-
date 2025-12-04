/**
 * SemantixStorage Constants
 * Centralized storage keys and configuration for all Semantix features
 */

// ═══════════════════════════════════════════════════════════════════════════
// STORAGE KEYS - All keys used by Semantix features
// ═══════════════════════════════════════════════════════════════════════════

export const STORAGE_KEYS = {
  // Favorites
  FAVORITES: "semantix_favorites",
  FAVORITES_ORDER: "semantix_favorites_order",

  // User preferences
  PREFERENCES: "semantix_preferences",
  SIDEBAR_COLLAPSED: "semantix_sidebar_collapsed",
  MEMORY_FETCH_ENABLED: "memoryFetchEnabled",

  // Project settings
  SELECTED_PROJECT_ID: "selectedProjectId",
  SELECTED_PROJECT_NAME: "selectedProjectName",
  USER_SETTINGS: "user_settings",

  // Cache keys
  CACHE_PREFIX: "semantix_cache_",
  PROJECTS_CACHE: "semantix_cache_projects",

  // Feature flags
  FEATURE_FLAGS: "semantix_feature_flags",

  // Analytics / Debug
  DEBUG_LOG: "semantix_debug_log",
  LAST_SYNC: "semantix_last_sync",
};

// ═══════════════════════════════════════════════════════════════════════════
// STORAGE TYPES - Where data should be stored
// ═══════════════════════════════════════════════════════════════════════════

export const STORAGE_TYPE = {
  // chrome.storage.local - Persists across sessions, syncs via bridge
  CHROME_LOCAL: "chrome_local",

  // chrome.storage.sync - Syncs across devices (limited to 100KB)
  CHROME_SYNC: "chrome_sync",

  // localStorage - Session/temporary data, no bridge needed but quota limited
  LOCAL_STORAGE: "local_storage",

  // Memory only - Lost on page refresh
  MEMORY: "memory",
};

// ═══════════════════════════════════════════════════════════════════════════
// STORAGE SCHEMA - Defines structure for each key
// ═══════════════════════════════════════════════════════════════════════════

export const STORAGE_SCHEMA = {
  [STORAGE_KEYS.FAVORITES]: {
    type: STORAGE_TYPE.CHROME_LOCAL,
    default: [],
    version: 1,
    description: "List of favorited conversations",
    schema: {
      // Array of FavoriteItem
      // {
      //   conversationId: string,
      //   title: string,
      //   addedAt: number (timestamp),
      //   provider: string ('chatgpt' | 'claude' | 'qwen'),
      //   url: string (optional),
      //   tags: string[] (optional),
      // }
    },
  },

  [STORAGE_KEYS.PREFERENCES]: {
    type: STORAGE_TYPE.CHROME_LOCAL,
    default: {},
    version: 1,
    description: "User preferences and settings",
    schema: {
      // {
      //   theme: string,
      //   sidebarCollapsed: boolean,
      //   memoryFetchEnabled: boolean,
      //   showFavoritesInSidebar: boolean,
      //   maxFavorites: number,
      // }
    },
  },

  [STORAGE_KEYS.FEATURE_FLAGS]: {
    type: STORAGE_TYPE.CHROME_LOCAL,
    default: {
      favorites: true,
      memoryFetch: true,
      sidebar: true,
      quickJump: true,
      reflectionSlot: true,
    },
    version: 1,
    description: "Feature toggles",
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// MESSAGE TYPES - For bridge communication
// ═══════════════════════════════════════════════════════════════════════════

export const STORAGE_MESSAGE_TYPES = {
  // Requests (page -> loader)
  GET: "SEMANTIX_STORAGE_GET",
  SET: "SEMANTIX_STORAGE_SET",
  REMOVE: "SEMANTIX_STORAGE_REMOVE",
  GET_MULTIPLE: "SEMANTIX_STORAGE_GET_MULTIPLE",
  SET_MULTIPLE: "SEMANTIX_STORAGE_SET_MULTIPLE",

  // Responses (loader -> page)
  RESPONSE: "SEMANTIX_STORAGE_RESPONSE",

  // Updates (loader -> page, broadcast on change)
  UPDATE: "SEMANTIX_STORAGE_UPDATE",
};

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

export const STORAGE_CONFIG = {
  // Bridge communication
  SOURCE_PAGE: "semantix-storage",
  SOURCE_RESPONSE: "semantix-storage-response",

  // Timeouts
  REQUEST_TIMEOUT: 5000, // 5 seconds

  // Limits
  MAX_FAVORITES: 100,
  MAX_CACHE_AGE: 24 * 60 * 60 * 1000, // 24 hours

  // Versioning (for migrations)
  CURRENT_VERSION: 1,
};
