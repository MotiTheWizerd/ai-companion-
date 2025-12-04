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

  // Folders (generic system for all sections)
  SEMANTIX_FOLDERS: "semantix_folders",
  SELECTED_FOLDER: "semantix_selected_folder",

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
// FOLDER CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

export const FOLDER_CONFIG = {
  // Maximum number of root-level folders per section
  MAX_ROOT_FOLDERS: 10,

  // Maximum folder depth (root = 0, level1 = 1, level2 = 2)
  MAX_DEPTH: 2,

  // Maximum characters for folder name
  MAX_NAME_LENGTH: 50,

  // Default folder color
  DEFAULT_COLOR: "#6b7280",

  // Default folder icon
  DEFAULT_ICON: "folder",
};

// Available folder colors (for UI picker)
export const FOLDER_COLORS = [
  { id: "gray", value: "#6b7280", name: "Gray" },
  { id: "red", value: "#ef4444", name: "Red" },
  { id: "orange", value: "#f97316", name: "Orange" },
  { id: "amber", value: "#f59e0b", name: "Amber" },
  { id: "yellow", value: "#eab308", name: "Yellow" },
  { id: "lime", value: "#84cc16", name: "Lime" },
  { id: "green", value: "#22c55e", name: "Green" },
  { id: "emerald", value: "#10b981", name: "Emerald" },
  { id: "teal", value: "#14b8a6", name: "Teal" },
  { id: "cyan", value: "#06b6d4", name: "Cyan" },
  { id: "sky", value: "#0ea5e9", name: "Sky" },
  { id: "blue", value: "#3b82f6", name: "Blue" },
  { id: "indigo", value: "#6366f1", name: "Indigo" },
  { id: "violet", value: "#8b5cf6", name: "Violet" },
  { id: "purple", value: "#a855f7", name: "Purple" },
  { id: "fuchsia", value: "#d946ef", name: "Fuchsia" },
  { id: "pink", value: "#ec4899", name: "Pink" },
  { id: "rose", value: "#f43f5e", name: "Rose" },
];

// Available folder icons (for UI picker)
export const FOLDER_ICONS = [
  { id: "folder", name: "Folder" },
  { id: "folder-open", name: "Folder Open" },
  { id: "star", name: "Star" },
  { id: "heart", name: "Heart" },
  { id: "bookmark", name: "Bookmark" },
  { id: "tag", name: "Tag" },
  { id: "briefcase", name: "Briefcase" },
  { id: "code", name: "Code" },
  { id: "document", name: "Document" },
  { id: "lightning", name: "Lightning" },
  { id: "bulb", name: "Idea" },
  { id: "chat", name: "Chat" },
  { id: "archive", name: "Archive" },
  { id: "flag", name: "Flag" },
  { id: "home", name: "Home" },
  { id: "user", name: "User" },
  { id: "users", name: "Team" },
  { id: "globe", name: "Globe" },
  { id: "lock", name: "Lock" },
  { id: "key", name: "Key" },
];

// Section types that support folders
export const FOLDER_SECTIONS = {
  FAVORITES: "favorites",
  MEMORIES: "memories",
  PROMPTS: "prompts",
  SNIPPETS: "snippets",
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
      //   folderId: string | null (optional, for folder organization),
      // }
    },
  },

  [STORAGE_KEYS.SEMANTIX_FOLDERS]: {
    type: STORAGE_TYPE.CHROME_LOCAL,
    default: {},
    version: 1,
    description: "Folder structure for all Semantix sections",
    schema: {
      // Object keyed by section type
      // {
      //   favorites: {
      //     folders: {
      //       "uuid-1": {
      //         id: string,
      //         name: string,
      //         parentId: string | null,
      //         color: string (hex),
      //         icon: string,
      //         order: number,
      //         collapsed: boolean,
      //         createdAt: number (timestamp),
      //         updatedAt: number (timestamp),
      //       }
      //     }
      //   },
      //   memories: { folders: {} },
      //   prompts: { folders: {} },
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
      folders: true,
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
