import {
  GPT_SELECTORS,
  CONFIG,
  MENU_ITEMS,
  ICONS,
  CLASSES,
} from "./constants.js";
import {
  getFavoritesManager,
  getProjectsManager,
} from "../../SemantixStorage/index.js";
import { FolderTreeRenderer } from "./FolderTreeRenderer.js";
import { FOLDER_STYLES } from "./folderStyles.js";

/**
 * Semantix Sidebar Widget
 * Injects a collapsible "Semantix" section into ChatGPT's sidebar
 * Positioned as the first child of the aside element
 *
 * Now includes folder support with hierarchical organization!
 */

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const WIDGET_STYLES = `
/* Semantix Sidebar Section - Matches ChatGPT's native sidebar styling */
.${CLASSES.SECTION} {
  padding-bottom: calc(var(--sidebar-section-margin-top) - var(--sidebar-section-first-margin-top));
  margin-bottom: 8px;
}

.${CLASSES.HEADER} {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 8px;
  transition: background-color 0.15s ease;
  user-select: none;
}

.${CLASSES.HEADER}:hover {
  background-color: var(--sidebar-surface-secondary, rgba(255, 255, 255, 0.05));
}

.${CLASSES.HEADER_CONTENT} {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-primary, #ececec);
  font-size: 14px;
  font-weight: 500;
}

.${CLASSES.HEADER_CONTENT} svg {
  color: var(--text-secondary, #b4b4b4);
  opacity: 0.8;
}

.${CLASSES.TITLE} {
  background: linear-gradient(135deg, #10a37f 0%, #1a7f64 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 600;
}

.${CLASSES.CHEVRON} {
  color: var(--text-secondary, #b4b4b4);
  transition: transform 0.2s ease;
  display: flex;
  align-items: center;
}

.${CLASSES.SECTION}.${CLASSES.EXPANDED} .${CLASSES.CHEVRON} {
  transform: rotate(90deg);
}

.${CLASSES.MENU} {
  overflow: hidden;
  transition: max-height 0.2s ease, opacity 0.2s ease;
  max-height: 0;
  opacity: 0;
}

.${CLASSES.SECTION}.${CLASSES.EXPANDED} .${CLASSES.MENU} {
  max-height: 2000px;
  opacity: 1;
}

.${CLASSES.MENU_ITEM} {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px 10px 20px;
  cursor: pointer;
  border-radius: 8px;
  transition: background-color 0.15s ease;
  color: var(--text-primary, #ececec);
  font-size: 14px;
  text-decoration: none;
}

.${CLASSES.MENU_ITEM}:hover {
  background-color: var(--sidebar-surface-secondary, rgba(255, 255, 255, 0.05));
}

.${CLASSES.MENU_ICON} {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary, #b4b4b4);
  opacity: 0.7;
  flex-shrink: 0;
}

.${CLASSES.MENU_ITEM}:hover .${CLASSES.MENU_ICON} {
  opacity: 1;
  color: #10a37f;
}

.${CLASSES.MENU_LABEL} {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Badge for items */
.semantix-sidebar-badge {
  background: linear-gradient(135deg, #10a37f 0%, #1a7f64 100%);
  color: white;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 10px;
  flex-shrink: 0;
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION STYLES (Favorites, Projects, etc.)
   ═══════════════════════════════════════════════════════════════════════════ */

.semantix-section-item {
  margin-top: 4px;
  padding-top: 4px;
}

.semantix-section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px 6px 8px;
  color: var(--text-secondary, #8e8e8e);
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;
  border-radius: 6px;
  transition: background-color 0.15s ease;
  user-select: none;
}

.semantix-section-header:hover {
  background-color: var(--sidebar-surface-secondary, rgba(255, 255, 255, 0.03));
}

.semantix-section-header svg {
  width: 14px;
  height: 14px;
  opacity: 0.7;
}

/* Section chevron */
.semantix-section-chevron {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  color: var(--text-secondary, #8e8e8e);
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.semantix-section-chevron svg {
  width: 12px;
  height: 12px;
}

.semantix-section-item.expanded .semantix-section-chevron {
  transform: rotate(90deg);
}

/* Section content collapse */
.semantix-section-content {
  overflow: hidden;
  transition: max-height 0.2s ease, opacity 0.2s ease;
  max-height: 0;
  opacity: 0;
}

.semantix-section-item.expanded .semantix-section-content {
  max-height: 2000px;
  opacity: 1;
}

/* Add button in header (folder or item) */
.semantix-add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-left: auto;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: var(--text-secondary, #8e8e8e);
  cursor: pointer;
  opacity: 0.6;
  transition: background-color 0.15s ease, color 0.15s ease, opacity 0.15s ease;
}

.semantix-add-btn:hover {
  background-color: var(--sidebar-surface-secondary, rgba(255, 255, 255, 0.1));
  color: #10a37f;
  opacity: 1;
}

.semantix-add-btn svg {
  width: 14px;
  height: 14px;
  opacity: 1;
}

/* Loading state */
.semantix-loading {
  padding: 12px 16px;
  color: var(--text-secondary, #8e8e8e);
  font-size: 13px;
  text-align: center;
  font-style: italic;
}

/* Project item styles */
.semantix-project-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px 8px 16px;
  cursor: pointer;
  border-radius: 8px;
  transition: background-color 0.15s ease;
  color: var(--text-primary, #ececec);
  font-size: 14px;
  text-decoration: none;
}

.semantix-project-item:hover {
  background-color: var(--sidebar-surface-secondary, rgba(255, 255, 255, 0.05));
}

.semantix-project-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.semantix-project-icon svg {
  width: 16px;
  height: 16px;
}

.semantix-project-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
}

.semantix-project-remove {
  opacity: 0;
  color: var(--text-secondary, #8e8e8e);
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.15s ease, color 0.15s ease, background-color 0.15s ease;
  flex-shrink: 0;
}

.semantix-project-item:hover .semantix-project-remove {
  opacity: 1;
}

.semantix-project-remove:hover {
  color: #ef4444;
  background-color: rgba(239, 68, 68, 0.1);
}

.semantix-project-remove svg {
  width: 14px;
  height: 14px;
}

/* Project actions (menu button) */
.semantix-project-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s ease;
  margin-left: auto;
}

.semantix-project-item:hover .semantix-project-actions {
  opacity: 1;
}

.semantix-project-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  color: var(--text-secondary, #8e8e8e);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
  padding: 0;
}

.semantix-project-action-btn:hover {
  background-color: var(--sidebar-surface-secondary, rgba(255, 255, 255, 0.1));
  color: var(--text-primary, #ececec);
}

.semantix-project-action-btn svg {
  width: 14px;
  height: 14px;
}



/* ═══════════════════════════════════════════════════════════════════════════
   FAVORITE ITEM STYLES
   ═══════════════════════════════════════════════════════════════════════════ */

.semantix-favorite-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px 8px 16px;
  cursor: pointer;
  border-radius: 8px;
  transition: background-color 0.15s ease;
  color: var(--text-primary, #ececec);
  font-size: 14px;
  text-decoration: none;
}

.semantix-favorite-item:hover {
  background-color: var(--sidebar-surface-secondary, rgba(255, 255, 255, 0.05));
}

.semantix-favorite-item.active {
  background-color: var(--sidebar-surface-secondary, rgba(255, 255, 255, 0.08));
}

.semantix-favorite-star {
  color: #f5a623;
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.semantix-favorite-star svg {
  width: 14px;
  height: 14px;
}

.semantix-favorite-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
}

.semantix-favorite-remove {
  opacity: 0;
  color: var(--text-secondary, #8e8e8e);
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.15s ease, color 0.15s ease, background-color 0.15s ease;
  flex-shrink: 0;
}

.semantix-favorite-item:hover .semantix-favorite-remove {
  opacity: 1;
}

.semantix-favorite-remove:hover {
  color: #ef4444;
  background-color: rgba(239, 68, 68, 0.1);
}

.semantix-favorite-remove svg {
  width: 14px;
  height: 14px;
}

.semantix-favorites-empty {
  padding: 12px 16px;
  color: var(--text-secondary, #8e8e8e);
  font-size: 13px;
  text-align: center;
  font-style: italic;
}

.semantix-favorites-loading {
  padding: 12px 16px;
  color: var(--text-secondary, #8e8e8e);
  font-size: 13px;
  text-align: center;
}

/* Include folder styles */
${FOLDER_STYLES}
`;

// ═══════════════════════════════════════════════════════════════════════════
// WIDGET CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class SemantixSidebarWidget {
  constructor(options = {}) {
    this.documentRef = options.document || document;
    this.windowRef = options.window || window;
    this.isInjected = false;
    this.sectionElement = null;
    this.isCollapsed = false;
    this.observer = null;
    this.retryCount = 0;
    this.retryTimeout = null;
    this.favorites = [];
    this.favoritesManager = null;
    this.favoritesUnsubscribe = null;
    this.favoritesFoldersUnsubscribe = null;
    this.favoritesTreeRenderer = null;

    // Projects state
    this.projects = [];
    this.projectsManager = null;
    this.projectsUnsubscribe = null;
    this.projectsFoldersUnsubscribe = null;
    this.projectsTreeRenderer = null;

    // Event handlers bound to this instance
    this.handleHeaderClick = this.handleHeaderClick.bind(this);
    this.handleMenuItemClick = this.handleMenuItemClick.bind(this);
    this.handleFavoriteClick = this.handleFavoriteClick.bind(this);
    this.handleFavoriteRemove = this.handleFavoriteRemove.bind(this);
    this.handleFavoritesChange = this.handleFavoritesChange.bind(this);
    this.handleFavoritesFoldersChange =
      this.handleFavoritesFoldersChange.bind(this);
    this.handleProjectClick = this.handleProjectClick.bind(this);
    this.handleProjectRemove = this.handleProjectRemove.bind(this);
    this.handleProjectsChange = this.handleProjectsChange.bind(this);
    this.handleProjectsFoldersChange =
      this.handleProjectsFoldersChange.bind(this);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LIFECYCLE
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Initialize the widget
   */
  async init() {
    console.log("[SemantixSidebarWidget] Initializing...");

    // Initialize FavoritesManager
    this.favoritesManager = getFavoritesManager({ provider: "chatgpt" });

    // Initialize ProjectsManager
    this.projectsManager = getProjectsManager();

    // Load collapsed state from storage
    await this.loadCollapsedState();

    // Load favorites
    await this.loadFavorites();

    // Subscribe to favorites changes
    this.favoritesUnsubscribe = this.favoritesManager.onChange(
      this.handleFavoritesChange,
    );

    // Subscribe to favorites folder changes
    const favoritesFoldersManager = this.favoritesManager.getFoldersManager();
    this.favoritesFoldersUnsubscribe = favoritesFoldersManager.onChange(
      this.handleFavoritesFoldersChange,
    );

    // Load projects
    await this.loadProjects();

    // Subscribe to projects changes
    this.projectsUnsubscribe = this.projectsManager.onChange(
      this.handleProjectsChange,
    );

    // Subscribe to projects folder changes
    const projectsFoldersManager = this.projectsManager.getFoldersManager();
    this.projectsFoldersUnsubscribe = projectsFoldersManager.onChange(
      this.handleProjectsFoldersChange,
    );

    // Also listen for custom events
    this.windowRef.addEventListener(
      "semantix-favorites-change",
      this.handleFavoritesChange,
    );
    this.windowRef.addEventListener(
      "semantix-folders-change-favorites",
      this.handleFavoritesFoldersChange,
    );
    this.windowRef.addEventListener(
      "semantix-projects-change",
      this.handleProjectsChange,
    );
    this.windowRef.addEventListener(
      "semantix-folders-change-projects",
      this.handleProjectsFoldersChange,
    );

    // Inject styles
    this.injectStyles();

    // Try to inject the section
    this.tryInject();

    // Set up mutation observer for dynamic content
    this.setupObserver();

    console.log("[SemantixSidebarWidget] Initialized");
  }

  /**
   * Clean up the widget
   */
  destroy() {
    console.log("[SemantixSidebarWidget] Destroying...");

    // Clear retry timeout
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }

    // Disconnect observer
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    // Unsubscribe from favorites changes
    if (this.favoritesUnsubscribe) {
      this.favoritesUnsubscribe();
      this.favoritesUnsubscribe = null;
    }

    // Unsubscribe from favorites folder changes
    if (this.favoritesFoldersUnsubscribe) {
      this.favoritesFoldersUnsubscribe();
      this.favoritesFoldersUnsubscribe = null;
    }

    // Unsubscribe from projects changes
    if (this.projectsUnsubscribe) {
      this.projectsUnsubscribe();
      this.projectsUnsubscribe = null;
    }

    // Unsubscribe from projects folder changes
    if (this.projectsFoldersUnsubscribe) {
      this.projectsFoldersUnsubscribe();
      this.projectsFoldersUnsubscribe = null;
    }

    // Remove event listeners
    this.windowRef.removeEventListener(
      "semantix-favorites-change",
      this.handleFavoritesChange,
    );
    this.windowRef.removeEventListener(
      "semantix-folders-change-favorites",
      this.handleFavoritesFoldersChange,
    );
    this.windowRef.removeEventListener(
      "semantix-projects-change",
      this.handleProjectsChange,
    );
    this.windowRef.removeEventListener(
      "semantix-folders-change-projects",
      this.handleProjectsFoldersChange,
    );

    // Destroy favorites tree renderer
    if (this.favoritesTreeRenderer) {
      this.favoritesTreeRenderer.destroy();
      this.favoritesTreeRenderer = null;
    }

    // Destroy projects tree renderer
    if (this.projectsTreeRenderer) {
      this.projectsTreeRenderer.destroy();
      this.projectsTreeRenderer = null;
    }

    // Remove section element
    if (this.sectionElement) {
      this.sectionElement.remove();
      this.sectionElement = null;
    }

    // Remove styles
    const styleElement = this.documentRef.getElementById(
      "semantix-sidebar-styles",
    );
    if (styleElement) {
      styleElement.remove();
    }

    this.isInjected = false;
    console.log("[SemantixSidebarWidget] Destroyed");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FAVORITES
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Load favorites from storage
   */
  async loadFavorites() {
    try {
      this.favorites = await this.favoritesManager.getAll();
      console.log(
        `[SemantixSidebarWidget] Loaded ${this.favorites.length} favorites`,
      );
    } catch (error) {
      console.error("[SemantixSidebarWidget] Failed to load favorites:", error);
      this.favorites = [];
    }
  }

  /**
   * Handle favorites change event
   */
  async handleFavoritesChange(actionOrEvent, item) {
    console.log("[SemantixSidebarWidget] Favorites changed, refreshing...");
    await this.loadFavorites();
    await this.updateFavoritesContent();
    this.updateFavoritesBadge();
  }

  /**
   * Handle favorites folders change event
   */
  async handleFavoritesFoldersChange(actionOrEvent, data) {
    console.log(
      "[SemantixSidebarWidget] Favorites folders changed, refreshing...",
    );
    await this.updateFavoritesContent();
  }

  /**
   * Update the favorites content (folders + items)
   */
  async updateFavoritesContent() {
    if (!this.sectionElement) return;

    const contentContainer = this.sectionElement.querySelector(
      '[data-section="favorites"] .semantix-section-content',
    );
    if (!contentContainer) return;

    // Get organized structure
    const structure = await this.favoritesManager.getOrganizedStructure();

    // Render using folder tree renderer
    if (this.favoritesTreeRenderer) {
      await this.favoritesTreeRenderer.render(structure);
    }
  }

  /**
   * Update the favorites count badge (only counts items, not folders)
   */
  updateFavoritesBadge() {
    if (!this.sectionElement) return;

    const badge = this.sectionElement.querySelector(
      ".semantix-favorites-badge",
    );
    if (badge) {
      if (this.favorites.length > 0) {
        badge.textContent = this.favorites.length;
        badge.style.display = "inline";
      } else {
        badge.style.display = "none";
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PROJECTS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Load projects from storage
   */
  async loadProjects() {
    try {
      this.projects = await this.projectsManager.getAll();
      console.log(
        `[SemantixSidebarWidget] Loaded ${this.projects.length} projects`,
      );
    } catch (error) {
      console.error("[SemantixSidebarWidget] Failed to load projects:", error);
      this.projects = [];
    }
  }

  /**
   * Handle projects change event
   */
  async handleProjectsChange(actionOrEvent, item) {
    console.log("[SemantixSidebarWidget] Projects changed, refreshing...");
    await this.loadProjects();
    await this.updateProjectsContent();
    this.updateProjectsBadge();
  }

  /**
   * Handle projects folders change event
   */
  async handleProjectsFoldersChange(actionOrEvent, data) {
    console.log(
      "[SemantixSidebarWidget] Projects folders changed, refreshing...",
    );
    await this.updateProjectsContent();
  }

  /**
   * Update the projects content (folders + items)
   */
  async updateProjectsContent() {
    if (!this.sectionElement) return;

    const contentContainer = this.sectionElement.querySelector(
      '[data-section="projects"] .semantix-section-content',
    );
    if (!contentContainer) return;

    // Get organized structure
    const structure = await this.projectsManager.getOrganizedStructure();

    // Render using folder tree renderer
    if (this.projectsTreeRenderer) {
      await this.projectsTreeRenderer.render(structure);
    }
  }

  /**
   * Update the projects count badge
   */
  updateProjectsBadge() {
    if (!this.sectionElement) return;

    const badge = this.sectionElement.querySelector(".semantix-projects-badge");
    if (badge) {
      if (this.projects.length > 0) {
        badge.textContent = this.projects.length;
        badge.style.display = "inline";
      } else {
        badge.style.display = "none";
      }
    }
  }

  /**
   * Get current conversation ID from URL
   * @returns {string|null}
   */
  getCurrentConversationId() {
    const match =
      this.windowRef.location.pathname.match(/\/c\/([a-zA-Z0-9-]+)/);
    return match ? match[1] : null;
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} str
   * @returns {string}
   */
  escapeHtml(str) {
    if (!str) return "";
    const div = this.documentRef.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INJECTION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Inject CSS styles into the document
   */
  injectStyles() {
    if (this.documentRef.getElementById("semantix-sidebar-styles")) {
      return;
    }

    const styleElement = this.documentRef.createElement("style");
    styleElement.id = "semantix-sidebar-styles";
    styleElement.textContent = WIDGET_STYLES;
    this.documentRef.head.appendChild(styleElement);

    console.log("[SemantixSidebarWidget] Styles injected");
  }

  /**
   * Try to inject the section, with retries
   */
  tryInject() {
    if (this.isInjected) {
      console.log("[SemantixSidebarWidget] Already injected, skipping");
      return;
    }

    const success = this.inject();

    if (!success && this.retryCount < CONFIG.MAX_RETRIES) {
      this.retryCount++;
      console.log(
        `[SemantixSidebarWidget] Injection failed, retry ${this.retryCount}/${CONFIG.MAX_RETRIES}`,
      );
      this.retryTimeout = setTimeout(
        () => this.tryInject(),
        CONFIG.RETRY_INTERVAL,
      );
    } else if (!success) {
      console.warn("[SemantixSidebarWidget] Max retries reached, giving up");
    }
  }

  /**
   * Find the sidebar aside element
   * @returns {Element|null}
   */
  findSidebarAside() {
    const selectors = GPT_SELECTORS.SIDEBAR_ASIDE;

    for (const selector of selectors) {
      try {
        const element = this.documentRef.querySelector(selector);
        if (element) {
          console.log(
            `[SemantixSidebarWidget] Found sidebar aside with selector: ${selector}`,
          );
          return element;
        }
      } catch (e) {
        console.warn(
          `[SemantixSidebarWidget] Invalid selector: ${selector}`,
          e,
        );
      }
    }

    return null;
  }

  /**
   * Inject the Semantix section into the sidebar
   * @returns {boolean} Success
   */
  inject() {
    // Check if already exists
    const existing = this.documentRef.getElementById(CONFIG.SECTION_ID);
    if (existing) {
      console.log("[SemantixSidebarWidget] Section already exists");
      this.sectionElement = existing;
      this.isInjected = true;
      this.initTreeRenderers();
      this.bindEvents();
      this.updateFavoritesContent();
      this.updateProjectsContent();
      return true;
    }

    // Find the sidebar aside
    const aside = this.findSidebarAside();
    if (!aside) {
      console.log("[SemantixSidebarWidget] Sidebar aside not found");
      return false;
    }

    // Create the section element
    this.sectionElement = this.createSectionElement();

    // Insert as first child of aside
    aside.insertBefore(this.sectionElement, aside.firstChild);

    // Initialize tree renderers
    this.initTreeRenderers();

    // Bind events
    this.bindEvents();

    // Initial render
    this.updateFavoritesContent();
    this.updateProjectsContent();

    this.isInjected = true;
    this.retryCount = 0;
    console.log("[SemantixSidebarWidget] Section injected successfully");

    return true;
  }

  /**
   * Initialize tree renderers for favorites and projects
   */
  initTreeRenderers() {
    // Favorites tree renderer
    const favoritesContainer = this.sectionElement?.querySelector(
      '[data-section="favorites"] .semantix-section-content',
    );

    if (favoritesContainer) {
      this.favoritesTreeRenderer = new FolderTreeRenderer({
        foldersManager: this.favoritesManager.getFoldersManager(),
        favoritesManager: this.favoritesManager,
        document: this.documentRef,
        window: this.windowRef,
        onFavoriteClick: this.handleFavoriteClick,
        onFavoriteRemove: this.handleFavoriteRemove,
        getCurrentConversationId: () => this.getCurrentConversationId(),
        escapeHtml: (str) => this.escapeHtml(str),
      });
      this.favoritesTreeRenderer.init(favoritesContainer);
    }

    // Projects tree renderer
    const projectsContainer = this.sectionElement?.querySelector(
      '[data-section="projects"] .semantix-section-content',
    );

    if (projectsContainer) {
      this.projectsTreeRenderer = new FolderTreeRenderer({
        foldersManager: this.projectsManager.getFoldersManager(),
        favoritesManager: this.projectsManager, // Same interface
        document: this.documentRef,
        window: this.windowRef,
        onFavoriteClick: this.handleProjectClick,
        onFavoriteRemove: this.handleProjectRemove,
        getCurrentConversationId: () => null, // Projects don't have active state
        escapeHtml: (str) => this.escapeHtml(str),
        itemType: "project",
      });
      this.projectsTreeRenderer.init(projectsContainer);
    }
  }

  /**
   * Create the section DOM element
   * @returns {HTMLElement}
   */
  createSectionElement() {
    const section = this.documentRef.createElement("div");
    section.id = CONFIG.SECTION_ID;
    section.className = `${CLASSES.SECTION} ${this.isCollapsed ? CLASSES.COLLAPSED : CLASSES.EXPANDED}`;

    const favoritesCount = this.favorites.length;

    section.innerHTML = `
      <div class="${CLASSES.HEADER}" data-action="toggle">
        <div class="${CLASSES.HEADER_CONTENT}">
          ${ICONS.semantix}
          <span class="${CLASSES.TITLE}">Semantix</span>
        </div>
        <div class="${CLASSES.CHEVRON}">
          ${ICONS.chevronRight}
        </div>
      </div>
      <div class="${CLASSES.MENU}">
        <!-- Favorites Section -->
        <div class="semantix-section-item expanded" data-section="favorites">
          <div class="semantix-section-header" data-action="toggle-section">
            <span class="semantix-section-chevron">${ICONS.chevronRight}</span>
            ${ICONS.star}
            <span>Favorites</span>
            <span class="semantix-sidebar-badge semantix-favorites-badge" style="${favoritesCount > 0 ? "" : "display:none"}">${favoritesCount}</span>
            <button class="semantix-add-btn" data-action="create-folder" data-section="favorites" title="Create new folder">
              ${ICONS.folderPlus}
            </button>
          </div>
          <div class="semantix-section-content">
            <!-- Folder tree will be rendered here by FolderTreeRenderer -->
            <div class="semantix-loading">Loading...</div>
          </div>
        </div>

        <!-- Projects Section -->
        <div class="semantix-section-item expanded" data-section="projects">
          <div class="semantix-section-header" data-action="toggle-section">
            <span class="semantix-section-chevron">${ICONS.chevronRight}</span>
            ${ICONS.folder}
            <span>Projects</span>
            <span class="semantix-sidebar-badge semantix-projects-badge" style="${this.projects.length > 0 ? "" : "display:none"}">${this.projects.length}</span>
            <button class="semantix-add-btn" data-action="add-project" data-section="projects" title="Add new project">
              ${ICONS.plus}
            </button>
          </div>
          <div class="semantix-section-content">
            <!-- Projects tree will be rendered here -->
            <div class="semantix-loading">Loading...</div>
          </div>
        </div>
      </div>
    `;

    return section;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EVENT HANDLING
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Bind event listeners
   */
  bindEvents() {
    if (!this.sectionElement) return;

    // Header click (expand/collapse)
    const header = this.sectionElement.querySelector(`.${CLASSES.HEADER}`);
    if (header) {
      header.removeEventListener("click", this.handleHeaderClick);
      header.addEventListener("click", this.handleHeaderClick);
    }

    // Menu items
    const menuItems = this.sectionElement.querySelectorAll(
      `.${CLASSES.MENU_ITEM}`,
    );
    menuItems.forEach((item) => {
      item.removeEventListener("click", this.handleMenuItemClick);
      item.addEventListener("click", this.handleMenuItemClick);
    });

    // Add buttons in section headers
    const addBtns = this.sectionElement.querySelectorAll(".semantix-add-btn");
    addBtns.forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const action = btn.dataset.action;
        const section = btn.dataset.section;

        if (action === "create-folder" && section === "favorites") {
          await this.handleCreateFavoritesFolder();
        } else if (action === "add-project") {
          await this.handleAddProject();
        }
      });
    });

    // Section headers click (toggle collapse)
    const sectionHeaders = this.sectionElement.querySelectorAll(
      ".semantix-section-header",
    );
    sectionHeaders.forEach((header) => {
      header.addEventListener("click", (e) => {
        // Don't toggle if clicking on add button
        if (e.target.closest(".semantix-add-btn")) {
          return;
        }
        const sectionItem = header.closest(".semantix-section-item");
        const sectionName = sectionItem?.dataset.section;
        if (sectionName) {
          this.toggleSection(sectionName);
        }
      });
    });

    // Load section collapsed states
    this.loadSectionStates();
  }

  /**
   * Toggle a section's collapsed state
   * @param {string} sectionName - 'favorites' or 'projects'
   */
  toggleSection(sectionName) {
    const section = this.sectionElement?.querySelector(
      `[data-section="${sectionName}"]`,
    );
    if (!section) return;

    const isExpanded = section.classList.contains("expanded");

    if (isExpanded) {
      section.classList.remove("expanded");
    } else {
      section.classList.add("expanded");
    }

    // Save state
    this.saveSectionState(sectionName, !isExpanded);
  }

  /**
   * Load section collapsed states from storage
   */
  loadSectionStates() {
    const sections = ["favorites", "projects"];

    for (const sectionName of sections) {
      try {
        const stored = localStorage.getItem(
          `semantix_${sectionName}_section_expanded`,
        );
        const isExpanded = stored === null ? true : stored === "true";

        const section = this.sectionElement?.querySelector(
          `[data-section="${sectionName}"]`,
        );
        if (section) {
          if (isExpanded) {
            section.classList.add("expanded");
          } else {
            section.classList.remove("expanded");
          }
        }
      } catch (error) {
        console.warn(
          `[SemantixSidebarWidget] Failed to load ${sectionName} section state:`,
          error,
        );
      }
    }
  }

  /**
   * Save section collapsed state to storage
   * @param {string} sectionName
   * @param {boolean} isExpanded
   */
  saveSectionState(sectionName, isExpanded) {
    try {
      localStorage.setItem(
        `semantix_${sectionName}_section_expanded`,
        isExpanded ? "true" : "false",
      );
    } catch (error) {
      console.warn(
        `[SemantixSidebarWidget] Failed to save ${sectionName} section state:`,
        error,
      );
    }
  }

  /**
   * Handle create folder in favorites section
   */
  async handleCreateFavoritesFolder() {
    const foldersManager = this.favoritesManager.getFoldersManager();

    // Check if can create more root folders
    const canCreate = await foldersManager.canCreateRootFolder();
    if (!canCreate) {
      console.warn("[SemantixSidebarWidget] Max root folders reached");
      return;
    }

    // Create folder with default name
    const folder = await foldersManager.create({
      name: "New Folder",
      parentId: null,
    });

    if (folder) {
      // Refresh and start rename
      await this.updateFavoritesContent();
      this.favoritesTreeRenderer.startRename(folder.id);
    }
  }

  /**
   * Handle add new project
   */
  async handleAddProject() {
    // Create project with default name
    const project = await this.projectsManager.add({
      name: "New Project",
    });

    if (project) {
      // Refresh - project will appear in list
      await this.updateProjectsContent();
      this.updateProjectsBadge();
      // Start inline rename for the new project
      if (this.projectsTreeRenderer) {
        this.projectsTreeRenderer.startItemRename(project.id);
      }
    }
  }

  /**
   * Handle project click
   * @param {Event} e
   */
  handleProjectClick(e) {
    const target = e.currentTarget;
    const projectId = target.dataset.projectId;
    console.log(`[SemantixSidebarWidget] Project clicked:`, projectId);
  }

  /**
   * Handle project remove
   * @param {Event} e
   */
  async handleProjectRemove(e) {
    e.preventDefault();
    e.stopPropagation();

    const target = e.currentTarget;
    const projectId = target.dataset.removeId;

    if (!projectId) return;

    console.log(`[SemantixSidebarWidget] Removing project:`, projectId);

    try {
      await this.projectsManager.remove(projectId);
      // Change event will trigger refresh
    } catch (error) {
      console.error("[SemantixSidebarWidget] Failed to remove project:", error);
    }
  }

  /**
   * Unbind event listeners
   */
  unbindEvents() {
    if (!this.sectionElement) return;

    const header = this.sectionElement.querySelector(`.${CLASSES.HEADER}`);
    if (header) {
      header.removeEventListener("click", this.handleHeaderClick);
    }

    const menuItems = this.sectionElement.querySelectorAll(
      `.${CLASSES.MENU_ITEM}`,
    );
    menuItems.forEach((item) => {
      item.removeEventListener("click", this.handleMenuItemClick);
    });
  }

  /**
   * Handle header click (expand/collapse)
   * @param {Event} e
   */
  handleHeaderClick(e) {
    e.preventDefault();
    this.toggleCollapsed();
  }

  /**
   * Handle menu item click
   * @param {Event} e
   */
  handleMenuItemClick(e) {
    e.preventDefault();

    const target = e.currentTarget;
    const action = target.dataset.action;
    const itemId = target.dataset.itemId;

    console.log(`[SemantixSidebarWidget] Menu item clicked: ${action}`, itemId);

    // Emit custom event for handling by parent
    const customEvent = new CustomEvent("semantix-menu-action", {
      detail: { action, itemId },
      bubbles: true,
    });
    this.sectionElement.dispatchEvent(customEvent);

    // Also handle internally if needed
    this.windowRef.postMessage(
      {
        source: "semantix-sidebar",
        type: "MENU_ACTION",
        action,
        itemId,
      },
      "*",
    );
  }

  /**
   * Handle favorite item click
   * @param {Event} e
   */
  handleFavoriteClick(e) {
    // Allow default navigation to happen
    // Just log for now
    const target = e.currentTarget;
    const conversationId = target.dataset.conversationId;
    console.log(`[SemantixSidebarWidget] Favorite clicked:`, conversationId);
  }

  /**
   * Handle favorite remove button click
   * @param {Event} e
   */
  async handleFavoriteRemove(e) {
    e.preventDefault();
    e.stopPropagation();

    const target = e.currentTarget;
    const conversationId = target.dataset.removeId;

    if (!conversationId) return;

    console.log(`[SemantixSidebarWidget] Removing favorite:`, conversationId);

    try {
      await this.favoritesManager.remove(conversationId);
      // Change event will trigger refresh
    } catch (error) {
      console.error(
        "[SemantixSidebarWidget] Failed to remove favorite:",
        error,
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // COLLAPSE STATE
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Toggle collapsed state
   */
  toggleCollapsed() {
    this.isCollapsed = !this.isCollapsed;
    this.updateCollapsedUI();
    this.saveCollapsedState();
  }

  /**
   * Update UI based on collapsed state
   */
  updateCollapsedUI() {
    if (!this.sectionElement) return;

    if (this.isCollapsed) {
      this.sectionElement.classList.remove(CLASSES.EXPANDED);
      this.sectionElement.classList.add(CLASSES.COLLAPSED);
    } else {
      this.sectionElement.classList.remove(CLASSES.COLLAPSED);
      this.sectionElement.classList.add(CLASSES.EXPANDED);
    }
  }

  /**
   * Load collapsed state from storage
   */
  async loadCollapsedState() {
    try {
      const stored = localStorage.getItem(CONFIG.STORAGE_KEY);
      if (stored !== null) {
        this.isCollapsed = stored === "true";
      } else {
        this.isCollapsed = CONFIG.DEFAULT_COLLAPSED;
      }
    } catch (error) {
      console.warn(
        "[SemantixSidebarWidget] Failed to load collapsed state:",
        error,
      );
      this.isCollapsed = CONFIG.DEFAULT_COLLAPSED;
    }
  }

  /**
   * Save collapsed state to storage
   */
  saveCollapsedState() {
    try {
      localStorage.setItem(
        CONFIG.STORAGE_KEY,
        this.isCollapsed ? "true" : "false",
      );
    } catch (error) {
      console.warn(
        "[SemantixSidebarWidget] Failed to save collapsed state:",
        error,
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MUTATION OBSERVER
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Set up mutation observer to handle dynamic sidebar changes
   */
  setupObserver() {
    if (this.observer) {
      this.observer.disconnect();
    }

    // Debounce timer
    let debounceTimer = null;

    this.observer = new MutationObserver((mutations) => {
      // Debounce the handling
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      debounceTimer = setTimeout(() => {
        this.handleMutations(mutations);
      }, CONFIG.DEBOUNCE_DELAY);
    });

    // Observe the body for changes
    this.observer.observe(this.documentRef.body, {
      childList: true,
      subtree: true,
    });

    console.log("[SemantixSidebarWidget] Observer set up");
  }

  /**
   * Handle mutations from the observer
   * @param {MutationRecord[]} mutations
   */
  handleMutations(mutations) {
    // Check if our section was removed
    if (this.isInjected && this.sectionElement) {
      if (!this.documentRef.contains(this.sectionElement)) {
        console.log(
          "[SemantixSidebarWidget] Section was removed, re-injecting...",
        );
        this.isInjected = false;
        this.sectionElement = null;
        this.tryInject();
        return;
      }
    }

    // Check if we need to inject (if not already)
    if (!this.isInjected) {
      this.tryInject();
      return;
    }

    // Update active state based on URL change
    const currentId = this.getCurrentConversationId();
    if (this.folderTreeRenderer) {
      this.folderTreeRenderer.updateActiveState(currentId);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create and initialize a new SemantixSidebarWidget
 * @param {Object} options
 * @returns {SemantixSidebarWidget}
 */
export function createSemantixSidebarWidget(options = {}) {
  const widget = new SemantixSidebarWidget(options);
  widget.init();
  return widget;
}

export default SemantixSidebarWidget;
