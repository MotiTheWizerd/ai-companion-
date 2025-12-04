/**
 * ProjectsManager
 * Manages projects using SemantixStorage
 * Provides high-level API for adding, removing, and querying projects
 * Supports folder organization via folderId (same pattern as FavoritesManager)
 */

import { getSemantixStorage } from "./SemantixStorage.js";
import { STORAGE_KEYS, STORAGE_CONFIG } from "./constants.js";
import { getSectionFoldersManager } from "./SectionFoldersManager.js";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES (for documentation)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @typedef {Object} ProjectItem
 * @property {string} id - Unique project ID
 * @property {string} name - Project name
 * @property {string} [description] - Optional project description
 * @property {string} color - Project color (hex)
 * @property {string} icon - Project icon
 * @property {number} createdAt - Timestamp when created
 * @property {number} updatedAt - Timestamp when last updated
 * @property {string|null} [folderId] - Folder ID for organization (null = root level)
 */

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const PROJECTS_CONFIG = {
  MAX_PROJECTS: 50,
  DEFAULT_COLOR: "#6b7280",
  DEFAULT_ICON: "folder",
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class ProjectsManager {
  constructor(options = {}) {
    this.storage = options.storage || getSemantixStorage();
    this.windowRef = options.window || window;
    this.listeners = new Set();
    this.cache = null;
    this.cacheTime = 0;
    this.cacheTTL = 5000; // 5 seconds cache

    // Folder manager for this section
    this.foldersManager = getSectionFoldersManager("projects");

    // Selected folder state (for folder-aware adding)
    this.selectedFolderId = null;
    this.selectedFolderLoaded = false;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FOLDER MANAGER ACCESS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get the folders manager for projects
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
      this.selectedFolderId = data.projects || null;
      this.selectedFolderLoaded = true;

      // Validate that the folder still exists
      if (this.selectedFolderId) {
        const folder = await this.foldersManager.get(this.selectedFolderId);
        if (!folder) {
          console.log(
            "[ProjectsManager] Selected folder no longer exists, clearing",
          );
          this.selectedFolderId = null;
          await this.saveSelectedFolder();
        }
      }

      return this.selectedFolderId;
    } catch (error) {
      console.error(
        "[ProjectsManager] Failed to load selected folder:",
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
      data.projects = this.selectedFolderId;
      await this.storage.set(STORAGE_KEYS.SELECTED_FOLDER, data);
      return true;
    } catch (error) {
      console.error(
        "[ProjectsManager] Failed to save selected folder:",
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
          "[ProjectsManager] Cannot select non-existent folder:",
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

    console.log("[ProjectsManager] Selected folder:", folderId);
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
   * Get all projects
   * @param {boolean} [forceRefresh=false] - Force refresh from storage
   * @returns {Promise<ProjectItem[]>}
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
      const projects = await this.storage.get(STORAGE_KEYS.PROJECTS, []);
      this.cache = projects;
      this.cacheTime = Date.now();
      return projects;
    } catch (error) {
      console.error("[ProjectsManager] Failed to get projects:", error);
      return [];
    }
  }

  /**
   * Add a new project
   * @param {Object} params - Project parameters
   * @param {string} params.name - Project name
   * @param {string} [params.description] - Project description
   * @param {string} [params.color] - Project color
   * @param {string} [params.icon] - Project icon
   * @param {string|null} [params.folderId] - Folder ID (undefined to use selected folder)
   * @param {boolean} [params.useSelectedFolder=true] - Whether to use selected folder if folderId not specified
   * @returns {Promise<ProjectItem|null>}
   */
  async add({
    name,
    description = "",
    color,
    icon,
    folderId,
    useSelectedFolder = true,
  }) {
    if (!name || typeof name !== "string") {
      console.error("[ProjectsManager] Project name is required");
      return null;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      console.error("[ProjectsManager] Project name cannot be empty");
      return null;
    }

    // Check limit
    const all = await this.getAll();
    if (all.length >= PROJECTS_CONFIG.MAX_PROJECTS) {
      console.warn("[ProjectsManager] Max projects limit reached");
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
          "[ProjectsManager] Folder not found, adding to root:",
          folderId,
        );
        folderId = null;
      }
    }

    // Create project item
    const project = {
      id: this.generateId(),
      name: trimmedName,
      description,
      color: color || PROJECTS_CONFIG.DEFAULT_COLOR,
      icon: icon || PROJECTS_CONFIG.DEFAULT_ICON,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      folderId,
    };

    try {
      await this.storage.addToList(STORAGE_KEYS.PROJECTS, project, {
        unique: true,
        uniqueKey: "id",
        prepend: true, // Most recent first
      });

      // Invalidate cache
      this.cache = null;

      // Notify listeners
      this.notifyListeners("added", project);

      console.log("[ProjectsManager] Added project:", project.name);
      return project;
    } catch (error) {
      console.error("[ProjectsManager] Failed to add project:", error);
      return null;
    }
  }

  /**
   * Remove a project
   * @param {string} projectId - Project ID to remove
   * @returns {Promise<boolean>}
   */
  async remove(projectId) {
    if (!projectId) {
      console.error("[ProjectsManager] projectId is required");
      return false;
    }

    try {
      // Get the item before removing (for notification)
      const item = await this.get(projectId);

      await this.storage.removeFromList(STORAGE_KEYS.PROJECTS, "id", projectId);

      // Invalidate cache
      this.cache = null;

      // Notify listeners
      if (item) {
        this.notifyListeners("removed", item);
      }

      console.log("[ProjectsManager] Removed project:", projectId);
      return true;
    } catch (error) {
      console.error("[ProjectsManager] Failed to remove project:", error);
      return false;
    }
  }

  /**
   * Get a specific project by ID
   * @param {string} projectId - Project ID
   * @returns {Promise<ProjectItem|null>}
   */
  async get(projectId) {
    if (!projectId) return null;

    const all = await this.getAll();
    return all.find((p) => p.id === projectId) || null;
  }

  /**
   * Update a project's properties
   * @param {string} projectId - Project ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<ProjectItem|null>}
   */
  async update(projectId, updates) {
    if (!projectId) return null;

    try {
      // Don't allow changing id or createdAt
      const { id: _, createdAt: __, ...safeUpdates } = updates;
      safeUpdates.updatedAt = Date.now();

      await this.storage.updateInList(
        STORAGE_KEYS.PROJECTS,
        "id",
        projectId,
        safeUpdates,
      );

      // Invalidate cache
      this.cache = null;

      const updated = await this.get(projectId);
      this.notifyListeners("updated", updated);

      return updated;
    } catch (error) {
      console.error("[ProjectsManager] Failed to update project:", error);
      return null;
    }
  }

  /**
   * Clear all projects
   * @returns {Promise<boolean>}
   */
  async clearAll() {
    try {
      await this.storage.set(STORAGE_KEYS.PROJECTS, []);
      this.cache = null;
      this.notifyListeners("cleared", null);
      console.log("[ProjectsManager] Cleared all projects");
      return true;
    } catch (error) {
      console.error("[ProjectsManager] Failed to clear projects:", error);
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FOLDER-BASED QUERIES
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get projects in a specific folder
   * @param {string|null} folderId - Folder ID (null for root level items)
   * @returns {Promise<ProjectItem[]>}
   */
  async getByFolder(folderId = null) {
    const all = await this.getAll();
    return all.filter((p) => p.folderId === folderId);
  }

  /**
   * Get projects at root level (not in any folder)
   * @returns {Promise<ProjectItem[]>}
   */
  async getRootItems() {
    return this.getByFolder(null);
  }

  /**
   * Move a project to a different folder
   * @param {string} projectId - Project ID
   * @param {string|null} newFolderId - New folder ID (null for root)
   * @returns {Promise<ProjectItem|null>}
   */
  async moveToFolder(projectId, newFolderId) {
    if (!projectId) {
      console.error("[ProjectsManager] projectId is required");
      return null;
    }

    // Validate new folder if not null
    if (newFolderId !== null) {
      const folder = await this.foldersManager.get(newFolderId);
      if (!folder) {
        console.error(
          "[ProjectsManager] Target folder not found:",
          newFolderId,
        );
        return null;
      }
    }

    return this.update(projectId, { folderId: newFolderId });
  }

  /**
   * Get count of projects in a folder
   * @param {string|null} folderId - Folder ID (null for root)
   * @returns {Promise<number>}
   */
  async countInFolder(folderId = null) {
    const items = await this.getByFolder(folderId);
    return items.length;
  }

  /**
   * Delete all projects in a specific folder (used when deleting folder)
   * @param {string} folderId - Folder ID
   * @returns {Promise<number>} - Number of deleted items
   */
  async deleteInFolder(folderId) {
    if (!folderId) {
      console.error("[ProjectsManager] folderId is required");
      return 0;
    }

    const items = await this.getByFolder(folderId);
    let deleted = 0;

    for (const item of items) {
      const success = await this.remove(item.id);
      if (success) deleted++;
    }

    console.log(
      "[ProjectsManager] Deleted",
      deleted,
      "items from folder:",
      folderId,
    );
    return deleted;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // QUERY METHODS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get projects count
   * @returns {Promise<number>}
   */
  async count() {
    const all = await this.getAll();
    return all.length;
  }

  /**
   * Search projects by name
   * @param {string} query - Search query
   * @returns {Promise<ProjectItem[]>}
   */
  async search(query) {
    if (!query) return [];

    const all = await this.getAll();
    const lowerQuery = query.toLowerCase();

    return all.filter((p) => {
      const name = p.name?.toLowerCase() || "";
      const description = p.description?.toLowerCase() || "";
      return name.includes(lowerQuery) || description.includes(lowerQuery);
    });
  }

  /**
   * Get recent projects
   * @param {number} [limit=10] - Max number to return
   * @returns {Promise<ProjectItem[]>}
   */
  async getRecent(limit = 10) {
    const all = await this.getAll();
    return all.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
  }

  /**
   * Get organized structure for UI rendering
   * Returns folders with their items, plus root items
   * @returns {Promise<Object>}
   */
  async getOrganizedStructure() {
    const [projects, folderTree] = await Promise.all([
      this.getAll(),
      this.foldersManager.getTree(),
    ]);

    // Group projects by folderId
    const itemsByFolder = new Map();
    itemsByFolder.set(null, []); // Root items

    for (const project of projects) {
      const key = project.folderId || null;
      if (!itemsByFolder.has(key)) {
        itemsByFolder.set(key, []);
      }
      itemsByFolder.get(key).push(project);
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
      totalItems: projects.length,
      totalFolders: await this.foldersManager.count(),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CHANGE LISTENERS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Subscribe to projects changes
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
   * @param {ProjectItem|null} item - The affected item
   */
  notifyListeners(action, item) {
    for (const callback of this.listeners) {
      try {
        callback(action, item);
      } catch (error) {
        console.error("[ProjectsManager] Listener error:", error);
      }
    }

    // Also emit a custom event for external listeners
    this.windowRef.dispatchEvent(
      new CustomEvent("semantix-projects-change", {
        detail: { action, item },
      }),
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // UTILITY METHODS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Generate unique project ID
   * @returns {string}
   */
  generateId() {
    return `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Debug: Log current state
   */
  async debug() {
    const projects = await this.getAll();
    const structure = await this.getOrganizedStructure();

    console.group("[ProjectsManager] Debug Info");
    console.log("Total projects:", projects.length);
    console.log("Total folders:", structure.totalFolders);
    console.log("Root items:", structure.rootItems.length);
    console.log("Projects:", projects);
    console.log("Organized structure:", structure);
    console.log("Selected folder:", this.selectedFolderId);
    console.groupEnd();

    return {
      count: projects.length,
      projects,
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
 * @returns {ProjectsManager}
 */
export function getProjectsManager(options = {}) {
  if (!instance) {
    instance = new ProjectsManager(options);
  }
  return instance;
}

/**
 * Create new instance (for testing or multiple contexts)
 * @param {Object} options
 * @returns {ProjectsManager}
 */
export function createProjectsManager(options = {}) {
  return new ProjectsManager(options);
}

export default ProjectsManager;
