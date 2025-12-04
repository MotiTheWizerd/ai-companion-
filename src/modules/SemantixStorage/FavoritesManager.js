/**
 * FavoritesManager
 * Manages favorite conversations using SemantixStorage
 * Provides high-level API for adding, removing, and querying favorites
 * Supports folder organization via folderId
 * Tracks selected folder for folder-aware favoriting
 */

import { getSemantixStorage } from "./SemantixStorage.js";
import { STORAGE_KEYS, STORAGE_CONFIG } from "./constants.js";
import { getSectionFoldersManager } from "./SectionFoldersManager.js";

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
 * @property {string|null} [folderId] - Folder ID for organization (null = root level)
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

    // Folder manager for this section
    this.foldersManager = getSectionFoldersManager("favorites");

    // Selected folder state (for folder-aware favoriting)
    this.selectedFolderId = null;
    this.selectedFolderLoaded = false;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FOLDER MANAGER ACCESS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get the folders manager for favorites
   * @returns {SectionFoldersManager}
   */
  getFoldersManager() {
    return this.foldersManager;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SELECTED FOLDER STATE
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Load selected folder from storage
   * @returns {Promise<string|null>}
   */
  async loadSelectedFolder() {
    if (this.selectedFolderLoaded) {
      return this.selectedFolderId;
    }

    try {
      const data = await this.storage.get(STORAGE_KEYS.SELECTED_FOLDER, {});
      this.selectedFolderId = data.favorites || null;
      this.selectedFolderLoaded = true;

      // Validate that the folder still exists
      if (this.selectedFolderId) {
        const folder = await this.foldersManager.get(this.selectedFolderId);
        if (!folder) {
          console.log(
            "[FavoritesManager] Selected folder no longer exists, clearing",
          );
          this.selectedFolderId = null;
          await this.saveSelectedFolder();
        }
      }

      return this.selectedFolderId;
    } catch (error) {
      console.error(
        "[FavoritesManager] Failed to load selected folder:",
        error,
      );
      return null;
    }
  }

  /**
   * Save selected folder to storage
   * @returns {Promise<boolean>}
   */
  async saveSelectedFolder() {
    try {
      const data = await this.storage.get(STORAGE_KEYS.SELECTED_FOLDER, {});
      data.favorites = this.selectedFolderId;
      await this.storage.set(STORAGE_KEYS.SELECTED_FOLDER, data);
      return true;
    } catch (error) {
      console.error(
        "[FavoritesManager] Failed to save selected folder:",
        error,
      );
      return false;
    }
  }

  /**
   * Get the currently selected folder ID
   * @returns {Promise<string|null>}
   */
  async getSelectedFolderId() {
    await this.loadSelectedFolder();
    return this.selectedFolderId;
  }

  /**
   * Set the selected folder
   * @param {string|null} folderId - Folder ID to select (null for root)
   * @returns {Promise<boolean>}
   */
  async setSelectedFolder(folderId) {
    // Validate folder exists if not null
    if (folderId !== null) {
      const folder = await this.foldersManager.get(folderId);
      if (!folder) {
        console.error(
          "[FavoritesManager] Cannot select non-existent folder:",
          folderId,
        );
        return false;
      }
    }

    this.selectedFolderId = folderId;
    this.selectedFolderLoaded = true;
    await this.saveSelectedFolder();

    // Notify listeners
    this.notifyListeners("folderSelected", { folderId });

    console.log("[FavoritesManager] Selected folder:", folderId);
    return true;
  }

  /**
   * Clear the selected folder (back to root)
   * @returns {Promise<boolean>}
   */
  async clearSelectedFolder() {
    return this.setSelectedFolder(null);
  }

  /**
   * Get the selected folder object
   * @returns {Promise<Object|null>}
   */
  async getSelectedFolder() {
    const folderId = await this.getSelectedFolderId();
    if (!folderId) return null;
    return this.foldersManager.get(folderId);
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
    if (
      !forceRefresh &&
      this.cache &&
      Date.now() - this.cacheTime < this.cacheTTL
    ) {
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
   * @param {string|null} [params.folderId] - Folder ID (null for root, undefined to use selected folder)
   * @param {boolean} [params.useSelectedFolder=true] - Whether to use selected folder if folderId not specified
   * @returns {Promise<FavoriteItem|null>}
   */
  async add({
    conversationId,
    title,
    url,
    tags = [],
    folderId,
    useSelectedFolder = true,
  }) {
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

    // Use selected folder if folderId not explicitly provided
    if (folderId === undefined && useSelectedFolder) {
      folderId = await this.getSelectedFolderId();
    } else if (folderId === undefined) {
      folderId = null;
    }

    // Validate folderId if provided
    if (folderId !== null) {
      const folder = await this.foldersManager.get(folderId);
      if (!folder) {
        console.warn(
          "[FavoritesManager] Folder not found, adding to root:",
          folderId,
        );
        folderId = null;
      }
    }

    // Create favorite item
    const favorite = {
      conversationId,
      title: title || "Untitled",
      addedAt: Date.now(),
      provider: this.provider,
      url: url || this.buildUrl(conversationId),
      tags,
      folderId,
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
        conversationId,
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
   * @param {string|null} [params.folderId] - Folder ID (undefined to use selected folder)
   * @param {boolean} [params.useSelectedFolder=true] - Whether to use selected folder
   * @returns {Promise<{isFavorite: boolean, item: FavoriteItem|null}>}
   */
  async toggle({
    conversationId,
    title,
    url,
    folderId,
    useSelectedFolder = true,
  }) {
    const isFav = await this.isFavorite(conversationId);

    if (isFav) {
      await this.remove(conversationId);
      return { isFavorite: false, item: null };
    } else {
      const item = await this.add({
        conversationId,
        title,
        url,
        folderId,
        useSelectedFolder,
      });
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
        safeUpdates,
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

  // ─────────────────────────────────────────────────────────────────────────
  // FOLDER-BASED QUERIES
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get favorites in a specific folder
   * @param {string|null} folderId - Folder ID (null for root level items)
   * @returns {Promise<FavoriteItem[]>}
   */
  async getByFolder(folderId = null) {
    const all = await this.getAll();
    return all.filter((fav) => fav.folderId === folderId);
  }

  /**
   * Get favorites at root level (not in any folder)
   * @returns {Promise<FavoriteItem[]>}
   */
  async getRootItems() {
    return this.getByFolder(null);
  }

  /**
   * Move a favorite to a different folder
   * @param {string} conversationId - Conversation ID
   * @param {string|null} newFolderId - New folder ID (null for root)
   * @returns {Promise<FavoriteItem|null>}
   */
  async moveToFolder(conversationId, newFolderId) {
    if (!conversationId) {
      console.error("[FavoritesManager] conversationId is required");
      return null;
    }

    // Validate new folder if not null
    if (newFolderId !== null) {
      const folder = await this.foldersManager.get(newFolderId);
      if (!folder) {
        console.error(
          "[FavoritesManager] Target folder not found:",
          newFolderId,
        );
        return null;
      }
    }

    return this.update(conversationId, { folderId: newFolderId });
  }

  /**
   * Get count of favorites in a folder (not counting subfolders)
   * @param {string|null} folderId - Folder ID (null for root)
   * @returns {Promise<number>}
   */
  async countInFolder(folderId = null) {
    const items = await this.getByFolder(folderId);
    return items.length;
  }

  /**
   * Get count of favorites in a folder and all its subfolders
   * @param {string|null} folderId - Folder ID (null for root level only)
   * @returns {Promise<number>}
   */
  async countInFolderRecursive(folderId) {
    if (folderId === null) {
      // For root, just count root items
      return this.countInFolder(null);
    }

    const all = await this.getAll();
    const folders = await this.foldersManager.getFolders();

    // Collect this folder and all descendants
    const folderIds = new Set([folderId]);
    const collectDescendants = (parentId) => {
      for (const folder of Object.values(folders)) {
        if (folder.parentId === parentId) {
          folderIds.add(folder.id);
          collectDescendants(folder.id);
        }
      }
    };
    collectDescendants(folderId);

    // Count items in these folders
    return all.filter((fav) => folderIds.has(fav.folderId)).length;
  }

  /**
   * Delete all favorites in a specific folder (used when deleting folder)
   * @param {string} folderId - Folder ID
   * @returns {Promise<number>} - Number of deleted items
   */
  async deleteInFolder(folderId) {
    if (!folderId) {
      console.error("[FavoritesManager] folderId is required");
      return 0;
    }

    const items = await this.getByFolder(folderId);
    let deleted = 0;

    for (const item of items) {
      const success = await this.remove(item.conversationId);
      if (success) deleted++;
    }

    console.log(
      "[FavoritesManager] Deleted",
      deleted,
      "items from folder:",
      folderId,
    );
    return deleted;
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
    return all.sort((a, b) => b.addedAt - a.addedAt).slice(0, limit);
  }

  /**
   * Get organized structure for UI rendering
   * Returns folders with their items, plus root items
   * @returns {Promise<Object>}
   */
  async getOrganizedStructure() {
    const [favorites, folderTree] = await Promise.all([
      this.getAll(),
      this.foldersManager.getTree(),
    ]);

    // Group favorites by folderId
    const itemsByFolder = new Map();
    itemsByFolder.set(null, []); // Root items

    for (const fav of favorites) {
      const key = fav.folderId || null;
      if (!itemsByFolder.has(key)) {
        itemsByFolder.set(key, []);
      }
      itemsByFolder.get(key).push(fav);
    }

    // Build structure
    const buildNode = (node) => ({
      folder: node.folder,
      items: itemsByFolder.get(node.folder.id) || [],
      children: node.children.map(buildNode),
      depth: node.depth,
    });

    return {
      rootItems: itemsByFolder.get(null) || [],
      folders: folderTree.map(buildNode),
      totalItems: favorites.length,
      totalFolders: await this.foldersManager.count(),
    };
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
      }),
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
    const structure = await this.getOrganizedStructure();

    console.group("[FavoritesManager] Debug Info");
    console.log("Provider:", this.provider);
    console.log("Total favorites:", favorites.length);
    console.log("Total folders:", structure.totalFolders);
    console.log("Root items:", structure.rootItems.length);
    console.log("All tags:", tags);
    console.log("Favorites:", favorites);
    console.log("Organized structure:", structure);
    console.groupEnd();

    return {
      provider: this.provider,
      count: favorites.length,
      tags,
      favorites,
      structure,
      selectedFolderId: this.selectedFolderId,
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
