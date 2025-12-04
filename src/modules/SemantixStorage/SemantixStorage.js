/**
 * SemantixStorage
 * Unified storage system for all Semantix features
 * Uses postMessage bridge to communicate with loader.js for chrome.storage access
 */

import {
  STORAGE_KEYS,
  STORAGE_TYPE,
  STORAGE_SCHEMA,
  STORAGE_MESSAGE_TYPES,
  STORAGE_CONFIG,
} from "./constants.js";

// ═══════════════════════════════════════════════════════════════════════════
// MAIN CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class SemantixStorage {
  constructor(options = {}) {
    this.windowRef = options.window || window;
    this.listeners = new Map();
    this.pendingRequests = new Map();
    this.cache = new Map();
    this.isInitialized = false;

    // Bind methods
    this.handleMessage = this.handleMessage.bind(this);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LIFECYCLE
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Initialize the storage system
   */
  init() {
    if (this.isInitialized) {
      console.log("[SemantixStorage] Already initialized");
      return;
    }

    // Listen for responses from loader
    this.windowRef.addEventListener("message", this.handleMessage);

    this.isInitialized = true;
    console.log("[SemantixStorage] Initialized");
  }

  /**
   * Clean up the storage system
   */
  destroy() {
    this.windowRef.removeEventListener("message", this.handleMessage);
    this.listeners.clear();
    this.pendingRequests.clear();
    this.cache.clear();
    this.isInitialized = false;
    console.log("[SemantixStorage] Destroyed");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BRIDGE COMMUNICATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Generate unique request ID
   * @returns {string}
   */
  generateRequestId() {
    return `semantix_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Send request to loader via postMessage
   * @param {string} type - Message type
   * @param {Object} payload - Request payload
   * @returns {Promise<any>}
   */
  sendRequest(type, payload = {}) {
    return new Promise((resolve, reject) => {
      const requestId = this.generateRequestId();

      // Store pending request
      this.pendingRequests.set(requestId, { resolve, reject });

      // Send message to loader
      this.windowRef.postMessage(
        {
          source: STORAGE_CONFIG.SOURCE_PAGE,
          type,
          requestId,
          payload,
        },
        "*"
      );

      // Timeout handling
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error(`Storage request timeout: ${type}`));
        }
      }, STORAGE_CONFIG.REQUEST_TIMEOUT);
    });
  }

  /**
   * Handle incoming messages from loader
   * @param {MessageEvent} event
   */
  handleMessage(event) {
    if (event.source !== this.windowRef) return;
    if (!event.data) return;

    const { source, type, requestId, success, data, error, key } = event.data;

    // Handle storage responses
    if (source === STORAGE_CONFIG.SOURCE_RESPONSE) {
      if (type === STORAGE_MESSAGE_TYPES.RESPONSE && requestId) {
        const pending = this.pendingRequests.get(requestId);
        if (pending) {
          this.pendingRequests.delete(requestId);
          if (success) {
            pending.resolve(data);
          } else {
            pending.reject(new Error(error || "Storage request failed"));
          }
        }
      }

      // Handle storage update broadcasts
      if (type === STORAGE_MESSAGE_TYPES.UPDATE) {
        this.handleStorageUpdate(key, data);
      }
    }
  }

  /**
   * Handle storage update from loader
   * @param {string} key - Storage key that changed
   * @param {any} value - New value
   */
  handleStorageUpdate(key, value) {
    // Update cache
    this.cache.set(key, value);

    // Notify listeners
    if (this.listeners.has(key)) {
      for (const callback of this.listeners.get(key)) {
        try {
          callback(value, key);
        } catch (err) {
          console.error(`[SemantixStorage] Listener error for ${key}:`, err);
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CORE METHODS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get value from storage
   * @param {string} key - Storage key
   * @param {any} defaultValue - Default value if key doesn't exist
   * @returns {Promise<any>}
   */
  async get(key, defaultValue = null) {
    try {
      const result = await this.sendRequest(STORAGE_MESSAGE_TYPES.GET, { key });

      // Return default if result is null/undefined
      if (result === null || result === undefined) {
        // Check schema for default
        const schema = STORAGE_SCHEMA[key];
        return schema?.default ?? defaultValue;
      }

      // Update cache
      this.cache.set(key, result);

      return result;
    } catch (error) {
      console.error(`[SemantixStorage] Get failed for ${key}:`, error);
      // Return default on error
      const schema = STORAGE_SCHEMA[key];
      return schema?.default ?? defaultValue;
    }
  }

  /**
   * Set value in storage
   * @param {string} key - Storage key
   * @param {any} value - Value to store
   * @returns {Promise<boolean>}
   */
  async set(key, value) {
    try {
      await this.sendRequest(STORAGE_MESSAGE_TYPES.SET, { key, value });

      // Update cache
      this.cache.set(key, value);

      return true;
    } catch (error) {
      console.error(`[SemantixStorage] Set failed for ${key}:`, error);
      return false;
    }
  }

  /**
   * Remove value from storage
   * @param {string} key - Storage key
   * @returns {Promise<boolean>}
   */
  async remove(key) {
    try {
      await this.sendRequest(STORAGE_MESSAGE_TYPES.REMOVE, { key });

      // Remove from cache
      this.cache.delete(key);

      return true;
    } catch (error) {
      console.error(`[SemantixStorage] Remove failed for ${key}:`, error);
      return false;
    }
  }

  /**
   * Get multiple values from storage
   * @param {string[]} keys - Array of storage keys
   * @returns {Promise<Object>}
   */
  async getMultiple(keys) {
    try {
      const result = await this.sendRequest(STORAGE_MESSAGE_TYPES.GET_MULTIPLE, { keys });

      // Update cache
      for (const [key, value] of Object.entries(result || {})) {
        this.cache.set(key, value);
      }

      return result || {};
    } catch (error) {
      console.error(`[SemantixStorage] GetMultiple failed:`, error);
      return {};
    }
  }

  /**
   * Set multiple values in storage
   * @param {Object} items - Object of key-value pairs
   * @returns {Promise<boolean>}
   */
  async setMultiple(items) {
    try {
      await this.sendRequest(STORAGE_MESSAGE_TYPES.SET_MULTIPLE, { items });

      // Update cache
      for (const [key, value] of Object.entries(items)) {
        this.cache.set(key, value);
      }

      return true;
    } catch (error) {
      console.error(`[SemantixStorage] SetMultiple failed:`, error);
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LIST OPERATIONS (for arrays like favorites)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Add item to a list
   * @param {string} key - Storage key for the list
   * @param {any} item - Item to add
   * @param {Object} options - Options { unique: boolean, uniqueKey: string, prepend: boolean }
   * @returns {Promise<any[]>}
   */
  async addToList(key, item, options = {}) {
    const { unique = true, uniqueKey = "id", prepend = false } = options;

    try {
      const list = (await this.get(key)) || [];

      // Check for duplicates if unique
      if (unique && uniqueKey && item[uniqueKey]) {
        const exists = list.some((i) => i[uniqueKey] === item[uniqueKey]);
        if (exists) {
          console.log(`[SemantixStorage] Item already exists in ${key}`);
          return list;
        }
      }

      // Add item
      if (prepend) {
        list.unshift(item);
      } else {
        list.push(item);
      }

      await this.set(key, list);
      return list;
    } catch (error) {
      console.error(`[SemantixStorage] addToList failed for ${key}:`, error);
      return [];
    }
  }

  /**
   * Remove item from a list
   * @param {string} key - Storage key for the list
   * @param {string} itemKey - Key to match (e.g., 'conversationId')
   * @param {any} itemValue - Value to match
   * @returns {Promise<any[]>}
   */
  async removeFromList(key, itemKey, itemValue) {
    try {
      const list = (await this.get(key)) || [];
      const filtered = list.filter((item) => item[itemKey] !== itemValue);

      if (filtered.length !== list.length) {
        await this.set(key, filtered);
      }

      return filtered;
    } catch (error) {
      console.error(`[SemantixStorage] removeFromList failed for ${key}:`, error);
      return [];
    }
  }

  /**
   * Update item in a list
   * @param {string} key - Storage key for the list
   * @param {string} itemKey - Key to match (e.g., 'conversationId')
   * @param {any} itemValue - Value to match
   * @param {Object} updates - Updates to apply
   * @returns {Promise<any[]>}
   */
  async updateInList(key, itemKey, itemValue, updates) {
    try {
      const list = (await this.get(key)) || [];
      const index = list.findIndex((item) => item[itemKey] === itemValue);

      if (index !== -1) {
        list[index] = { ...list[index], ...updates };
        await this.set(key, list);
      }

      return list;
    } catch (error) {
      console.error(`[SemantixStorage] updateInList failed for ${key}:`, error);
      return [];
    }
  }

  /**
   * Find item in a list
   * @param {string} key - Storage key for the list
   * @param {string} itemKey - Key to match
   * @param {any} itemValue - Value to match
   * @returns {Promise<any|null>}
   */
  async findInList(key, itemKey, itemValue) {
    try {
      const list = (await this.get(key)) || [];
      return list.find((item) => item[itemKey] === itemValue) || null;
    } catch (error) {
      console.error(`[SemantixStorage] findInList failed for ${key}:`, error);
      return null;
    }
  }

  /**
   * Check if item exists in a list
   * @param {string} key - Storage key for the list
   * @param {string} itemKey - Key to match
   * @param {any} itemValue - Value to match
   * @returns {Promise<boolean>}
   */
  async existsInList(key, itemKey, itemValue) {
    const item = await this.findInList(key, itemKey, itemValue);
    return item !== null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CHANGE LISTENERS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Subscribe to changes for a key
   * @param {string} key - Storage key to watch
   * @param {Function} callback - Callback function (value, key) => void
   * @returns {Function} Unsubscribe function
   */
  onChange(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);

    // Return unsubscribe function
    return () => {
      if (this.listeners.has(key)) {
        this.listeners.get(key).delete(callback);
      }
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CACHE METHODS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get value from cache (sync, no bridge call)
   * @param {string} key - Storage key
   * @returns {any|undefined}
   */
  getCached(key) {
    return this.cache.get(key);
  }

  /**
   * Check if key is in cache
   * @param {string} key - Storage key
   * @returns {boolean}
   */
  hasCached(key) {
    return this.cache.has(key);
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // UTILITY METHODS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get all storage keys used by Semantix
   * @returns {Object}
   */
  getStorageKeys() {
    return { ...STORAGE_KEYS };
  }

  /**
   * Get schema for a key
   * @param {string} key - Storage key
   * @returns {Object|null}
   */
  getSchema(key) {
    return STORAGE_SCHEMA[key] || null;
  }

  /**
   * Debug: Log current state
   */
  debug() {
    console.group("[SemantixStorage] Debug Info");
    console.log("Initialized:", this.isInitialized);
    console.log("Pending requests:", this.pendingRequests.size);
    console.log("Listeners:", Array.from(this.listeners.keys()));
    console.log("Cache:", Object.fromEntries(this.cache));
    console.groupEnd();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════

let instance = null;

/**
 * Get or create singleton instance
 * @param {Object} options
 * @returns {SemantixStorage}
 */
export function getSemantixStorage(options = {}) {
  if (!instance) {
    instance = new SemantixStorage(options);
    instance.init();
  }
  return instance;
}

/**
 * Create new instance (for testing or multiple contexts)
 * @param {Object} options
 * @returns {SemantixStorage}
 */
export function createSemantixStorage(options = {}) {
  const storage = new SemantixStorage(options);
  storage.init();
  return storage;
}

export default SemantixStorage;
