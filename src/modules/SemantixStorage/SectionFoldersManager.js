/**
 * SectionFoldersManager
 * Generic folder management system for any Semantix section
 * Supports up to 10 root folders and 2 levels of nesting
 *
 * Features:
 * - Create, rename, delete, move folders
 * - Folder colors and icons
 * - Collapse state persistence
 * - Depth validation (max 2 levels)
 * - Root folder limit (max 10)
 * - Event system for UI updates
 */

import { getSemantixStorage } from "./SemantixStorage.js";
import { STORAGE_KEYS, FOLDER_CONFIG, FOLDER_SECTIONS } from "./constants.js";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES (for documentation)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @typedef {Object} Folder
 * @property {string} id - Unique folder ID (UUID)
 * @property {string} name - Folder display name
 * @property {string|null} parentId - Parent folder ID (null = root level)
 * @property {string} color - Hex color code
 * @property {string} icon - Icon identifier
 * @property {number} order - Sort order within parent
 * @property {boolean} collapsed - Whether folder is collapsed in UI
 * @property {number} createdAt - Creation timestamp
 * @property {number} updatedAt - Last update timestamp
 */

/**
 * @typedef {Object} FolderTreeNode
 * @property {Folder} folder - The folder data
 * @property {FolderTreeNode[]} children - Child folder nodes
 * @property {number} depth - Depth level (0 = root, 1 = level1, 2 = level2)
 */

// ═══════════════════════════════════════════════════════════════════════════
// MAIN CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class SectionFoldersManager {
  /**
   * Create a folder manager for a specific section
   * @param {string} sectionType - Section type ('favorites', 'memories', 'prompts', etc.)
   * @param {Object} options - Configuration options
   */
  constructor(sectionType, options = {}) {
    if (!sectionType) {
      throw new Error("[SectionFoldersManager] sectionType is required");
    }

    this.sectionType = sectionType;
    this.storage = options.storage || getSemantixStorage();
    this.windowRef = options.window || window;
    this.listeners = new Set();

    // Cache
    this.cache = null;
    this.cacheTime = 0;
    this.cacheTTL = 5000; // 5 seconds
  }

  // ─────────────────────────────────────────────────────────────────────────
  // UTILITY METHODS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Generate a unique folder ID
   * @returns {string}
   */
  generateId() {
    return `folder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Invalidate the cache
   */
  invalidateCache() {
    this.cache = null;
    this.cacheTime = 0;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STORAGE ACCESS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get all folders data from storage
   * @param {boolean} forceRefresh - Force refresh from storage
   * @returns {Promise<Object>} - All sections folder data
   */
  async getAllSectionsData(forceRefresh = false) {
    if (!forceRefresh && this.cache && Date.now() - this.cacheTime < this.cacheTTL) {
      return this.cache;
    }

    try {
      const data = await this.storage.get(STORAGE_KEYS.SEMANTIX_FOLDERS, {});
      this.cache = data;
      this.cacheTime = Date.now();
      return data;
    } catch (error) {
      console.error("[SectionFoldersManager] Failed to get folders:", error);
      return {};
    }
  }

  /**
   * Get folders for current section
   * @param {boolean} forceRefresh - Force refresh from storage
   * @returns {Promise<Object>} - Folders object keyed by ID
   */
  async getFolders(forceRefresh = false) {
    const allData = await this.getAllSectionsData(forceRefresh);
    return allData[this.sectionType]?.folders || {};
  }

  /**
   * Save folders for current section
   * @param {Object} folders - Folders object to save
   * @returns {Promise<boolean>}
   */
  async saveFolders(folders) {
    try {
      const allData = await this.getAllSectionsData(true);

      if (!allData[this.sectionType]) {
        allData[this.sectionType] = { folders: {} };
      }

      allData[this.sectionType].folders = folders;

      await this.storage.set(STORAGE_KEYS.SEMANTIX_FOLDERS, allData);
      this.invalidateCache();

      return true;
    } catch (error) {
      console.error("[SectionFoldersManager] Failed to save folders:", error);
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CRUD OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Create a new folder
   * @param {Object} params - Folder parameters
   * @param {string} params.name - Folder name
   * @param {string|null} params.parentId - Parent folder ID (null for root)
   * @param {string} params.color - Folder color (hex)
   * @param {string} params.icon - Folder icon
   * @returns {Promise<Folder|null>} - Created folder or null if failed
   */
  async create({ name, parentId = null, color, icon }) {
    // Validate name
    if (!name || typeof name !== "string") {
      console.error("[SectionFoldersManager] Folder name is required");
      return null;
    }

    const trimmedName = name.trim().slice(0, FOLDER_CONFIG.MAX_NAME_LENGTH);
    if (!trimmedName) {
      console.error("[SectionFoldersManager] Folder name cannot be empty");
      return null;
    }

    const folders = await this.getFolders(true);

    // Check root folder limit
    if (parentId === null) {
      const rootCount = Object.values(folders).filter(f => f.parentId === null).length;
      if (rootCount >= FOLDER_CONFIG.MAX_ROOT_FOLDERS) {
        console.warn("[SectionFoldersManager] Maximum root folders reached:", FOLDER_CONFIG.MAX_ROOT_FOLDERS);
        return null;
      }
    }

    // Validate parent and check depth
    if (parentId !== null) {
      const parent = folders[parentId];
      if (!parent) {
        console.error("[SectionFoldersManager] Parent folder not found:", parentId);
        return null;
      }

      const parentDepth = this.calculateDepth(folders, parentId);
      if (parentDepth >= FOLDER_CONFIG.MAX_DEPTH - 1) {
        console.warn("[SectionFoldersManager] Maximum folder depth reached");
        return null;
      }
    }

    // Calculate order (add to end)
    const siblings = Object.values(folders).filter(f => f.parentId === parentId);
    const maxOrder = siblings.reduce((max, f) => Math.max(max, f.order || 0), -1);

    // Create folder
    const folder = {
      id: this.generateId(),
      name: trimmedName,
      parentId,
      color: color || FOLDER_CONFIG.DEFAULT_COLOR,
      icon: icon || FOLDER_CONFIG.DEFAULT_ICON,
      order: maxOrder + 1,
      collapsed: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Save
    folders[folder.id] = folder;
    const success = await this.saveFolders(folders);

    if (success) {
      this.notifyListeners("created", folder);
      console.log("[SectionFoldersManager] Created folder:", folder.name);
      return folder;
    }

    return null;
  }

  /**
   * Get a folder by ID
   * @param {string} folderId - Folder ID
   * @returns {Promise<Folder|null>}
   */
  async get(folderId) {
    if (!folderId) return null;
    const folders = await this.getFolders();
    return folders[folderId] || null;
  }

  /**
   * Get all folders as array
   * @returns {Promise<Folder[]>}
   */
  async getAll() {
    const folders = await this.getFolders();
    return Object.values(folders);
  }

  /**
   * Rename a folder
   * @param {string} folderId - Folder ID
   * @param {string} newName - New name
   * @returns {Promise<Folder|null>}
   */
  async rename(folderId, newName) {
    if (!folderId || !newName) {
      console.error("[SectionFoldersManager] folderId and newName are required");
      return null;
    }

    const trimmedName = newName.trim().slice(0, FOLDER_CONFIG.MAX_NAME_LENGTH);
    if (!trimmedName) {
      console.error("[SectionFoldersManager] Folder name cannot be empty");
      return null;
    }

    const folders = await this.getFolders(true);
    const folder = folders[folderId];

    if (!folder) {
      console.error("[SectionFoldersManager] Folder not found:", folderId);
      return null;
    }

    folder.name = trimmedName;
    folder.updatedAt = Date.now();

    const success = await this.saveFolders(folders);

    if (success) {
      this.notifyListeners("renamed", folder);
      console.log("[SectionFoldersManager] Renamed folder to:", trimmedName);
      return folder;
    }

    return null;
  }

  /**
   * Update folder properties (color, icon, etc.)
   * @param {string} folderId - Folder ID
   * @param {Object} updates - Properties to update
   * @returns {Promise<Folder|null>}
   */
  async update(folderId, updates) {
    if (!folderId) {
      console.error("[SectionFoldersManager] folderId is required");
      return null;
    }

    const folders = await this.getFolders(true);
    const folder = folders[folderId];

    if (!folder) {
      console.error("[SectionFoldersManager] Folder not found:", folderId);
      return null;
    }

    // Only allow specific updates (not id, parentId, createdAt)
    const allowedKeys = ["name", "color", "icon", "order", "collapsed"];
    for (const key of allowedKeys) {
      if (updates[key] !== undefined) {
        if (key === "name") {
          folder[key] = updates[key].trim().slice(0, FOLDER_CONFIG.MAX_NAME_LENGTH);
        } else {
          folder[key] = updates[key];
        }
      }
    }

    folder.updatedAt = Date.now();

    const success = await this.saveFolders(folders);

    if (success) {
      this.notifyListeners("updated", folder);
      return folder;
    }

    return null;
  }

  /**
   * Delete a folder and all its contents (subfolders + items)
   * @param {string} folderId - Folder ID
   * @param {Function} onDeleteItems - Callback to delete items in folder (receives folderId)
   * @returns {Promise<boolean>}
   */
  async delete(folderId, onDeleteItems = null) {
    if (!folderId) {
      console.error("[SectionFoldersManager] folderId is required");
      return false;
    }

    const folders = await this.getFolders(true);
    const folder = folders[folderId];

    if (!folder) {
      console.error("[SectionFoldersManager] Folder not found:", folderId);
      return false;
    }

    // Collect all folders to delete (this folder + all descendants)
    const foldersToDelete = this.collectDescendants(folders, folderId);
    foldersToDelete.push(folderId);

    // Delete items in each folder (if callback provided)
    if (onDeleteItems && typeof onDeleteItems === "function") {
      for (const id of foldersToDelete) {
        try {
          await onDeleteItems(id);
        } catch (error) {
          console.error("[SectionFoldersManager] Error deleting items in folder:", id, error);
        }
      }
    }

    // Delete folders
    for (const id of foldersToDelete) {
      delete folders[id];
    }

    const success = await this.saveFolders(folders);

    if (success) {
      this.notifyListeners("deleted", { id: folderId, deletedIds: foldersToDelete });
      console.log("[SectionFoldersManager] Deleted folder and descendants:", foldersToDelete.length);
      return true;
    }

    return false;
  }

  /**
   * Move a folder to a new parent
   * @param {string} folderId - Folder ID to move
   * @param {string|null} newParentId - New parent ID (null for root)
   * @returns {Promise<Folder|null>}
   */
  async move(folderId, newParentId) {
    if (!folderId) {
      console.error("[SectionFoldersManager] folderId is required");
      return null;
    }

    // Can't move to itself
    if (folderId === newParentId) {
      console.error("[SectionFoldersManager] Cannot move folder to itself");
      return null;
    }

    const folders = await this.getFolders(true);
    const folder = folders[folderId];

    if (!folder) {
      console.error("[SectionFoldersManager] Folder not found:", folderId);
      return null;
    }

    // Check if moving to root and root limit
    if (newParentId === null) {
      const rootCount = Object.values(folders).filter(
        f => f.parentId === null && f.id !== folderId
      ).length;
      if (rootCount >= FOLDER_CONFIG.MAX_ROOT_FOLDERS) {
        console.warn("[SectionFoldersManager] Maximum root folders reached");
        return null;
      }
    }

    // Validate new parent
    if (newParentId !== null) {
      const newParent = folders[newParentId];
      if (!newParent) {
        console.error("[SectionFoldersManager] New parent folder not found:", newParentId);
        return null;
      }

      // Can't move to a descendant (would create a cycle)
      const descendants = this.collectDescendants(folders, folderId);
      if (descendants.includes(newParentId)) {
        console.error("[SectionFoldersManager] Cannot move folder to its descendant");
        return null;
      }

      // Check depth limit
      const newParentDepth = this.calculateDepth(folders, newParentId);
      const subtreeDepth = this.calculateSubtreeDepth(folders, folderId);

      if (newParentDepth + 1 + subtreeDepth > FOLDER_CONFIG.MAX_DEPTH) {
        console.warn("[SectionFoldersManager] Move would exceed maximum depth");
        return null;
      }
    }

    // Calculate new order (add to end of new parent's children)
    const newSiblings = Object.values(folders).filter(
      f => f.parentId === newParentId && f.id !== folderId
    );
    const maxOrder = newSiblings.reduce((max, f) => Math.max(max, f.order || 0), -1);

    // Update folder
    folder.parentId = newParentId;
    folder.order = maxOrder + 1;
    folder.updatedAt = Date.now();

    const success = await this.saveFolders(folders);

    if (success) {
      this.notifyListeners("moved", folder);
      console.log("[SectionFoldersManager] Moved folder:", folder.name);
      return folder;
    }

    return null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // COLLAPSE STATE
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Toggle folder collapsed state
   * @param {string} folderId - Folder ID
   * @returns {Promise<boolean>} - New collapsed state
   */
  async toggleCollapsed(folderId) {
    const folder = await this.get(folderId);
    if (!folder) return false;

    const newState = !folder.collapsed;
    await this.update(folderId, { collapsed: newState });

    return newState;
  }

  /**
   * Set folder collapsed state
   * @param {string} folderId - Folder ID
   * @param {boolean} collapsed - Collapsed state
   * @returns {Promise<boolean>}
   */
  async setCollapsed(folderId, collapsed) {
    const result = await this.update(folderId, { collapsed });
    return result !== null;
  }

  /**
   * Expand all folders
   * @returns {Promise<boolean>}
   */
  async expandAll() {
    const folders = await this.getFolders(true);

    for (const folder of Object.values(folders)) {
      folder.collapsed = false;
      folder.updatedAt = Date.now();
    }

    const success = await this.saveFolders(folders);

    if (success) {
      this.notifyListeners("expandedAll", null);
    }

    return success;
  }

  /**
   * Collapse all folders
   * @returns {Promise<boolean>}
   */
  async collapseAll() {
    const folders = await this.getFolders(true);

    for (const folder of Object.values(folders)) {
      folder.collapsed = true;
      folder.updatedAt = Date.now();
    }

    const success = await this.saveFolders(folders);

    if (success) {
      this.notifyListeners("collapsedAll", null);
    }

    return success;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // QUERY METHODS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get root folders (parentId === null)
   * @returns {Promise<Folder[]>}
   */
  async getRootFolders() {
    const folders = await this.getFolders();
    return Object.values(folders)
      .filter(f => f.parentId === null)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  /**
   * Get children of a folder
   * @param {string} parentId - Parent folder ID
   * @returns {Promise<Folder[]>}
   */
  async getChildren(parentId) {
    const folders = await this.getFolders();
    return Object.values(folders)
      .filter(f => f.parentId === parentId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  /**
   * Get folder depth (0 = root level)
   * @param {string} folderId - Folder ID
   * @returns {Promise<number>}
   */
  async getDepth(folderId) {
    const folders = await this.getFolders();
    return this.calculateDepth(folders, folderId);
  }

  /**
   * Calculate depth of a folder (internal)
   * @param {Object} folders - Folders object
   * @param {string} folderId - Folder ID
   * @returns {number}
   */
  calculateDepth(folders, folderId) {
    let depth = 0;
    let currentId = folderId;

    while (currentId) {
      const folder = folders[currentId];
      if (!folder || folder.parentId === null) break;
      currentId = folder.parentId;
      depth++;
    }

    return depth;
  }

  /**
   * Calculate the maximum depth of a folder's subtree
   * @param {Object} folders - Folders object
   * @param {string} folderId - Folder ID
   * @returns {number}
   */
  calculateSubtreeDepth(folders, folderId) {
    const children = Object.values(folders).filter(f => f.parentId === folderId);

    if (children.length === 0) return 0;

    let maxChildDepth = 0;
    for (const child of children) {
      const childDepth = this.calculateSubtreeDepth(folders, child.id);
      maxChildDepth = Math.max(maxChildDepth, childDepth + 1);
    }

    return maxChildDepth;
  }

  /**
   * Collect all descendant folder IDs
   * @param {Object} folders - Folders object
   * @param {string} folderId - Folder ID
   * @returns {string[]}
   */
  collectDescendants(folders, folderId) {
    const descendants = [];
    const children = Object.values(folders).filter(f => f.parentId === folderId);

    for (const child of children) {
      descendants.push(child.id);
      descendants.push(...this.collectDescendants(folders, child.id));
    }

    return descendants;
  }

  /**
   * Get the path from root to a folder
   * @param {string} folderId - Folder ID
   * @returns {Promise<Folder[]>} - Array of folders from root to target
   */
  async getPath(folderId) {
    const folders = await this.getFolders();
    const path = [];
    let currentId = folderId;

    while (currentId) {
      const folder = folders[currentId];
      if (!folder) break;
      path.unshift(folder);
      currentId = folder.parentId;
    }

    return path;
  }

  /**
   * Get path as string array (folder names)
   * @param {string} folderId - Folder ID
   * @returns {Promise<string[]>}
   */
  async getPathNames(folderId) {
    const path = await this.getPath(folderId);
    return path.map(f => f.name);
  }

  /**
   * Check if can create a root folder
   * @returns {Promise<boolean>}
   */
  async canCreateRootFolder() {
    const rootFolders = await this.getRootFolders();
    return rootFolders.length < FOLDER_CONFIG.MAX_ROOT_FOLDERS;
  }

  /**
   * Check if can create a subfolder under a parent
   * @param {string} parentId - Parent folder ID
   * @returns {Promise<boolean>}
   */
  async canCreateSubfolder(parentId) {
    if (parentId === null) {
      return this.canCreateRootFolder();
    }

    const depth = await this.getDepth(parentId);
    return depth < FOLDER_CONFIG.MAX_DEPTH - 1;
  }

  /**
   * Get folder count
   * @returns {Promise<number>}
   */
  async count() {
    const folders = await this.getFolders();
    return Object.keys(folders).length;
  }

  /**
   * Get root folder count
   * @returns {Promise<number>}
   */
  async rootCount() {
    const rootFolders = await this.getRootFolders();
    return rootFolders.length;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TREE STRUCTURE
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get hierarchical tree structure for UI rendering
   * @returns {Promise<FolderTreeNode[]>}
   */
  async getTree() {
    const folders = await this.getFolders();
    const rootFolders = Object.values(folders)
      .filter(f => f.parentId === null)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    return rootFolders.map(folder => this.buildTreeNode(folders, folder, 0));
  }

  /**
   * Build a tree node recursively
   * @param {Object} folders - All folders
   * @param {Folder} folder - Current folder
   * @param {number} depth - Current depth
   * @returns {FolderTreeNode}
   */
  buildTreeNode(folders, folder, depth) {
    const children = Object.values(folders)
      .filter(f => f.parentId === folder.id)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(child => this.buildTreeNode(folders, child, depth + 1));

    return {
      folder,
      children,
      depth,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // REORDERING
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Reorder folders within the same parent
   * @param {string[]} orderedIds - Array of folder IDs in desired order
   * @param {string|null} parentId - Parent ID (null for root level)
   * @returns {Promise<boolean>}
   */
  async reorder(orderedIds, parentId = null) {
    if (!Array.isArray(orderedIds)) {
      console.error("[SectionFoldersManager] orderedIds must be an array");
      return false;
    }

    const folders = await this.getFolders(true);

    // Validate all IDs exist and have the correct parent
    for (const id of orderedIds) {
      const folder = folders[id];
      if (!folder) {
        console.error("[SectionFoldersManager] Folder not found:", id);
        return false;
      }
      if (folder.parentId !== parentId) {
        console.error("[SectionFoldersManager] Folder has different parent:", id);
        return false;
      }
    }

    // Update order
    orderedIds.forEach((id, index) => {
      folders[id].order = index;
      folders[id].updatedAt = Date.now();
    });

    const success = await this.saveFolders(folders);

    if (success) {
      this.notifyListeners("reordered", { parentId, orderedIds });
    }

    return success;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CHANGE LISTENERS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Subscribe to folder changes
   * @param {Function} callback - Callback (action, data) => void
   * @returns {Function} - Unsubscribe function
   */
  onChange(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of a change
   * @param {string} action - Action type
   * @param {any} data - Event data
   */
  notifyListeners(action, data) {
    for (const callback of this.listeners) {
      try {
        callback(action, data);
      } catch (error) {
        console.error("[SectionFoldersManager] Listener error:", error);
      }
    }

    // Also emit a custom event
    this.windowRef.dispatchEvent(
      new CustomEvent(`semantix-folders-change-${this.sectionType}`, {
        detail: { action, data, sectionType: this.sectionType },
      })
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DEBUG
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Debug: Log current state
   */
  async debug() {
    const folders = await this.getFolders(true);
    const tree = await this.getTree();
    const rootCount = await this.rootCount();
    const totalCount = await this.count();

    console.group(`[SectionFoldersManager:${this.sectionType}] Debug Info`);
    console.log("Section:", this.sectionType);
    console.log("Total folders:", totalCount);
    console.log("Root folders:", rootCount, "/", FOLDER_CONFIG.MAX_ROOT_FOLDERS);
    console.log("Max depth:", FOLDER_CONFIG.MAX_DEPTH);
    console.log("Folders:", folders);
    console.log("Tree:", tree);
    console.groupEnd();

    return {
      sectionType: this.sectionType,
      totalCount,
      rootCount,
      maxRootFolders: FOLDER_CONFIG.MAX_ROOT_FOLDERS,
      maxDepth: FOLDER_CONFIG.MAX_DEPTH,
      folders,
      tree,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

// Singleton instances per section
const instances = new Map();

/**
 * Get or create a folder manager for a section
 * @param {string} sectionType - Section type
 * @param {Object} options - Options
 * @returns {SectionFoldersManager}
 */
export function getSectionFoldersManager(sectionType, options = {}) {
  if (!instances.has(sectionType)) {
    instances.set(sectionType, new SectionFoldersManager(sectionType, options));
  }
  return instances.get(sectionType);
}

/**
 * Create a new folder manager instance (for testing or multiple contexts)
 * @param {string} sectionType - Section type
 * @param {Object} options - Options
 * @returns {SectionFoldersManager}
 */
export function createSectionFoldersManager(sectionType, options = {}) {
  return new SectionFoldersManager(sectionType, options);
}

/**
 * Convenience: Get favorites folder manager
 * @returns {SectionFoldersManager}
 */
export function getFavoritesFoldersManager() {
  return getSectionFoldersManager(FOLDER_SECTIONS.FAVORITES);
}

/**
 * Convenience: Get memories folder manager
 * @returns {SectionFoldersManager}
 */
export function getMemoriesFoldersManager() {
  return getSectionFoldersManager(FOLDER_SECTIONS.MEMORIES);
}

/**
 * Convenience: Get prompts folder manager
 * @returns {SectionFoldersManager}
 */
export function getPromptsFoldersManager() {
  return getSectionFoldersManager(FOLDER_SECTIONS.PROMPTS);
}

export default SectionFoldersManager;
