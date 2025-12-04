/**
 * FavoritesManager
 * Manages favorite conversations using SemantixStorage
 * Provides high-level API for adding, removing, and querying favorites
 */

import { getSemantixStorage } from "./SemantixStorage.js";
import { STORAGE_KEYS, STORAGE_CONFIG } from "./constants.js";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES (for documentation)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @typedef {Object} FavoriteItem
 * @property {string} conversationId - Unique conversation ID
 * @property {string} title - Conversation title
 * @property {number} addedAt - Timestamp when favorited
 * @property {string} provider - Provider name ('chatgpt' | 'claude' | 'qwen')
 * @property {string} [url] - Full URL to conversation
 * @property {string[]} [tags] - Optional tags for organization
 */

// ═══════════════════════════════════════════════════════════════════════════
// MAIN CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class FavoritesManager {
  constructor(options = {}) {
    this.storage = options.storage || getSemantixStorage();
    this.provider = options.provider || "chatgpt";
    this.windowRef = options.window || window;
    this.listeners = new Set();
    this.cache = null;
    this.cacheTime = 0;
    this.cacheTTL = 5000; // 5 seconds cache
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CORE METHODS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get all favorites
   * @param {boolean} [forceRefresh=false] - Force refresh from storage
   * @returns {Promise<FavoriteItem[]>}
   */
  async getAll(forceRefresh = false) {
    // Return cached if valid
    if (!forceRefresh && this.cache && Date.now() - this.cacheTime < this.cacheTTL) {
      return this.cache;
    }

    try {
      const favorites = await this.storage.get(STORAGE_KEYS.FAVORITES, []);
      this.cache = favorites;
      this.cacheTime = Date.now();
      return favorites;
    } catch (error) {
      console.error("[FavoritesManager] Failed to get favorites:", error);
      return [];
    }
  }

  /**
   * Get favorites for current provider only
   * @returns {Promise<FavoriteItem[]>}
   */
  async getForCurrentProvider() {
    const all = await this.getAll();
    return all.filter((fav) => fav.provider === this.provider);
  }

  /**
   * Add a conversation to favorites
   * @param {Object} params - Favorite parameters
   * @param {string} params.conversationId - Conversation ID
   * @param {string} params.title - Conversation title
   * @param {string} [params.url] - Conversation URL
   * @param {string[]} [params.tags] - Optional tags
   * @returns {Promise<FavoriteItem|null>}
   */
  async add({ conversationId, title, url, tags = [] }) {
    if (!conversationId) {
      console.error("[FavoritesManager] conversationId is required");
      return null;
    }

    // Check if already exists
    const exists = await this.isFavorite(conversationId);
    if (exists) {
      console.log("[FavoritesManager] Already favorited:", conversationId);
      return await this.get(conversationId);
    }

    // Check limit
    const all = await this.getAll();
    if (all.length >= STORAGE_CONFIG.MAX_FAVORITES) {
      console.warn("[FavoritesManager] Max favorites limit reached");
      return null;
    }

    // Create favorite item
    const favorite = {
      conversationId,
      title: title || "Untitled",
      addedAt: Date.now(),
      provider: this.provider,
      url: url || this.buildUrl(conversationId),
      tags,
    };

    try {
      await this.storage.addToList(STORAGE_KEYS.FAVORITES, favorite, {
        unique: true,
        uniqueKey: "conversationId",
        prepend: true, // Most recent first
      });

      // Invalidate cache
      this.cache = null;

      // Notify listeners
      this.notifyListeners("added", favorite);

      console.log("[FavoritesManager] Added favorite:", conversationId);
      return favorite;
    } catch (error) {
      console.error("[FavoritesManager] Failed to add favorite:", error);
      return null;
    }
  }

  /**
   * Remove a conversation from favorites
   * @param {string} conversationId - Conversation ID to remove
   * @returns {Promise<boolean>}
   */
  async remove(conversationId) {
    if (!conversationId) {
      console.error("[FavoritesManager] conversationId is required");
      return false;
    }

    try {
      // Get the item before removing (for notification)
      const item = await this.get(conversationId);

      await this.storage.removeFromList(
        STORAGE_KEYS.FAVORITES,
        "conversationId",
        conversationId
      );

      // Invalidate cache
      this.cache = null;

      // Notify listeners
      if (item) {
        this.notifyListeners("removed", item);
      }

      console.log("[FavoritesManager] Removed favorite:", conversationId);
      return true;
    } catch (error) {
      console.error("[FavoritesManager] Failed to remove favorite:", error);
      return false;
    }
  }

  /**
   * Toggle favorite status
   * @param {Object} params - Favorite parameters (used if adding)
   * @param {string} params.conversationId - Conversation ID
   * @param {string} params.title - Conversation title
   * @param {string} [params.url] - Conversation URL
   * @returns {Promise<{isFavorite: boolean, item: FavoriteItem|null}>}
   */
  async toggle({ conversationId, title, url }) {
    const isFav = await this.isFavorite(conversationId);

    if (isFav) {
      await this.remove(conversationId);
      return { isFavorite: false, item: null };
    } else {
      const item = await this.add({ conversationId, title, url });
      return { isFavorite: true, item };
    }
  }

  /**
   * Check if a conversation is favorited
   * @param {string} conversationId - Conversation ID
   * @returns {Promise<boolean>}
   */
  async isFavorite(conversationId) {
    if (!conversationId) return false;

    const all = await this.getAll();
    return all.some((fav) => fav.conversationId === conversationId);
  }

  /**
   * Get a specific favorite by conversation ID
   * @param {string} conversationId - Conversation ID
   * @returns {Promise<FavoriteItem|null>}
   */
  async get(conversationId) {
    if (!conversationId) return null;

    const all = await this.getAll();
    return all.find((fav) => fav.conversationId === conversationId) || null;
  }

  /**
   * Update a favorite's metadata
   * @param {string} conversationId - Conversation ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<FavoriteItem|null>}
   */
  async update(conversationId, updates) {
    if (!conversationId) return null;

    try {
      // Don't allow changing conversationId
      const { conversationId: _, ...safeUpdates } = updates;

      await this.storage.updateInList(
        STORAGE_KEYS.FAVORITES,
        "conversationId",
        conversationId,
        safeUpdates
      );

      // Invalidate cache
      this.cache = null;

      const updated = await this.get(conversationId);
      this.notifyListeners("updated", updated);

      return updated;
    } catch (error) {
      console.error("[FavoritesManager] Failed to update favorite:", error);
      return null;
    }
  }

  /**
   * Clear all favorites
   * @returns {Promise<boolean>}
   */
  async clearAll() {
    try {
      await this.storage.set(STORAGE_KEYS.FAVORITES, []);
      this.cache = null;
      this.notifyListeners("cleared", null);
      console.log("[FavoritesManager] Cleared all favorites");
      return true;
    } catch (error) {
      console.error("[FavoritesManager] Failed to clear favorites:", error);
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // QUERY METHODS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get favorites count
   * @returns {Promise<number>}
   */
  async count() {
    const all = await this.getAll();
    return all.length;
  }

  /**
   * Search favorites by title
   * @param {string} query - Search query
   * @returns {Promise<FavoriteItem[]>}
   */
  async search(query) {
    if (!query) return [];

    const all = await this.getAll();
    const lowerQuery = query.toLowerCase();

    return all.filter((fav) => {
      const title = fav.title?.toLowerCase() || "";
      const tags = fav.tags?.join(" ").toLowerCase() || "";
      return title.includes(lowerQuery) || tags.includes(lowerQuery);
    });
  }

  /**
   * Get favorites by tag
   * @param {string} tag - Tag to filter by
   * @returns {Promise<FavoriteItem[]>}
   */
  async getByTag(tag) {
    if (!tag) return [];

    const all = await this.getAll();
    return all.filter((fav) => fav.tags?.includes(tag));
  }

  /**
   * Get all unique tags
   * @returns {Promise<string[]>}
   */
  async getAllTags() {
    const all = await this.getAll();
    const tags = new Set();

    for (const fav of all) {
      if (fav.tags) {
        for (const tag of fav.tags) {
          tags.add(tag);
        }
      }
    }

    return Array.from(tags).sort();
  }

  /**
   * Get recent favorites
   * @param {number} [limit=10] - Max number to return
   * @returns {Promise<FavoriteItem[]>}
   */
  async getRecent(limit = 10) {
    const all = await this.getAll();
    return all
      .sort((a, b) => b.addedAt - a.addedAt)
      .slice(0, limit);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CHANGE LISTENERS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Subscribe to favorites changes
   * @param {Function} callback - Callback (action, item) => void
   * @returns {Function} Unsubscribe function
   */
  onChange(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of a change
   * @param {string} action - Action type ('added' | 'removed' | 'updated' | 'cleared')
   * @param {FavoriteItem|null} item - The affected item
   */
  notifyListeners(action, item) {
    for (const callback of this.listeners) {
      try {
        callback(action, item);
      } catch (error) {
        console.error("[FavoritesManager] Listener error:", error);
      }
    }

    // Also emit a custom event for external listeners
    this.windowRef.dispatchEvent(
      new CustomEvent("semantix-favorites-change", {
        detail: { action, item },
      })
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // UTILITY METHODS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Build URL for a conversation
   * @param {string} conversationId - Conversation ID
   * @returns {string}
   */
  buildUrl(conversationId) {
    switch (this.provider) {
      case "chatgpt":
        return `https://chatgpt.com/c/${conversationId}`;
      case "claude":
        return `https://claude.ai/chat/${conversationId}`;
      case "qwen":
        return `https://chat.qwen.ai/c/${conversationId}`;
      default:
        return `#${conversationId}`;
    }
  }

  /**
   * Set the current provider
   * @param {string} provider - Provider name
   */
  setProvider(provider) {
    this.provider = provider;
  }

  /**
   * Export favorites to JSON
   * @returns {Promise<string>}
   */
  async exportToJson() {
    const favorites = await this.getAll();
    return JSON.stringify(favorites, null, 2);
  }

  /**
   * Import favorites from JSON
   * @param {string} json - JSON string
   * @param {boolean} [merge=true] - Merge with existing or replace
   * @returns {Promise<number>} Number of imported items
   */
  async importFromJson(json, merge = true) {
    try {
      const imported = JSON.parse(json);

      if (!Array.isArray(imported)) {
        throw new Error("Invalid format: expected array");
      }

      if (merge) {
        const existing = await this.getAll();
        const existingIds = new Set(existing.map((f) => f.conversationId));

        let added = 0;
        for (const item of imported) {
          if (item.conversationId && !existingIds.has(item.conversationId)) {
            await this.add(item);
            added++;
          }
        }
        return added;
      } else {
        await this.storage.set(STORAGE_KEYS.FAVORITES, imported);
        this.cache = null;
        return imported.length;
      }
    } catch (error) {
      console.error("[FavoritesManager] Import failed:", error);
      return 0;
    }
  }

  /**
   * Debug: Log current state
   */
  async debug() {
    const favorites = await this.getAll();
    const tags = await this.getAllTags();

    console.group("[FavoritesManager] Debug Info");
    console.log("Provider:", this.provider);
    console.log("Total favorites:", favorites.length);
    console.log("All tags:", tags);
    console.log("Favorites:", favorites);
    console.groupEnd();

    return {
      provider: this.provider,
      count: favorites.length,
      tags,
      favorites,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════

let instance = null;

/**
 * Get or create singleton instance
 * @param {Object} options
 * @returns {FavoritesManager}
 */
export function getFavoritesManager(options = {}) {
  if (!instance) {
    instance = new FavoritesManager(options);
  }
  return instance;
}

/**
 * Create new instance (for testing or multiple contexts)
 * @param {Object} options
 * @returns {FavoritesManager}
 */
export function createFavoritesManager(options = {}) {
  return new FavoritesManager(options);
}

export default FavoritesManager;
