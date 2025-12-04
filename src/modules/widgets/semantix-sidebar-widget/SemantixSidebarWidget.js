import {
  GPT_SELECTORS,
  CONFIG,
  MENU_ITEMS,
  ICONS,
  CLASSES,
} from "./constants.js";
import { getFavoritesManager } from "../../SemantixStorage/index.js";

/**
 * Semantix Sidebar Widget
 * Injects a collapsible "Semantix" section into ChatGPT's sidebar
 * Positioned as the first child of the aside element
 *
 * Now includes a live favorites list!
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
  max-height: 1000px;
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

/* Badge for items (optional) */
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
   FAVORITES LIST STYLES
   ═══════════════════════════════════════════════════════════════════════════ */

.semantix-favorites-section {
  margin-top: 4px;
  padding-top: 4px;
}

.semantix-favorites-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px 6px 12px;
  color: var(--text-secondary, #8e8e8e);
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.semantix-favorites-header svg {
  width: 14px;
  height: 14px;
  opacity: 0.7;
}

.semantix-favorites-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

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
`;

// ═══════════════════════════════════════════════════════════════════════════
// ADDITIONAL ICONS
// ═══════════════════════════════════════════════════════════════════════════

const EXTRA_ICONS = {
  starSmall: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  x: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
};

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

    // Event handlers bound to this instance
    this.handleHeaderClick = this.handleHeaderClick.bind(this);
    this.handleMenuItemClick = this.handleMenuItemClick.bind(this);
    this.handleFavoriteClick = this.handleFavoriteClick.bind(this);
    this.handleFavoriteRemove = this.handleFavoriteRemove.bind(this);
    this.handleFavoritesChange = this.handleFavoritesChange.bind(this);
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

    // Load collapsed state from storage
    await this.loadCollapsedState();

    // Load favorites
    await this.loadFavorites();

    // Subscribe to favorites changes
    this.favoritesUnsubscribe = this.favoritesManager.onChange(
      this.handleFavoritesChange,
    );

    // Also listen for custom event (from FavoriteButton)
    this.windowRef.addEventListener(
      "semantix-favorites-change",
      this.handleFavoritesChange,
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

    // Remove event listener
    this.windowRef.removeEventListener(
      "semantix-favorites-change",
      this.handleFavoritesChange,
    );

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
    this.updateFavoritesList();
  }

  /**
   * Update the favorites list in the DOM
   */
  updateFavoritesList() {
    if (!this.sectionElement) return;

    const listContainer = this.sectionElement.querySelector(
      ".semantix-favorites-list",
    );
    if (!listContainer) return;

    // Get current conversation ID to highlight active
    const currentConversationId = this.getCurrentConversationId();

    if (this.favorites.length === 0) {
      listContainer.innerHTML = `
        <div class="semantix-favorites-empty">
          No favorites yet. Click ⭐ on a chat to add it!
        </div>
      `;
    } else {
      listContainer.innerHTML = this.favorites
        .map((fav) => {
          const isActive = fav.conversationId === currentConversationId;
          return `
          <a href="${fav.url || `/c/${fav.conversationId}`}"
             class="semantix-favorite-item ${isActive ? "active" : ""}"
             data-conversation-id="${fav.conversationId}"
             title="${fav.title}">
            <span class="semantix-favorite-star">${EXTRA_ICONS.starSmall}</span>
            <span class="semantix-favorite-title">${this.escapeHtml(fav.title)}</span>
            <span class="semantix-favorite-remove" data-remove-id="${fav.conversationId}" title="Remove from favorites">
              ${EXTRA_ICONS.x}
            </span>
          </a>
        `;
        })
        .join("");

      // Rebind remove button events
      this.bindFavoriteRemoveEvents();
    }

    // Update badge count
    this.updateFavoritesBadge();
  }

  /**
   * Update the favorites count badge
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
      this.bindEvents();
      this.updateFavoritesList();
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

    // Bind events
    this.bindEvents();

    this.isInjected = true;
    this.retryCount = 0;
    console.log("[SemantixSidebarWidget] Section injected successfully");

    return true;
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
        <div class="semantix-favorites-section">
          <div class="semantix-favorites-header">
            ${ICONS.star}
            <span>Favorites</span>
            <span class="semantix-sidebar-badge semantix-favorites-badge" style="${favoritesCount > 0 ? "" : "display:none"}">${favoritesCount}</span>
          </div>
          <div class="semantix-favorites-list">
            ${this.createFavoritesListHTML()}
          </div>
        </div>
      </div>
    `;

    return section;
  }

  /**
   * Create HTML for the favorites list
   * @returns {string}
   */
  createFavoritesListHTML() {
    const currentConversationId = this.getCurrentConversationId();

    if (this.favorites.length === 0) {
      return `
        <div class="semantix-favorites-empty">
          No favorites yet. Click ⭐ on a chat to add it!
        </div>
      `;
    }

    return this.favorites
      .map((fav) => {
        const isActive = fav.conversationId === currentConversationId;
        return `
        <a href="${fav.url || `/c/${fav.conversationId}`}"
           class="semantix-favorite-item ${isActive ? "active" : ""}"
           data-conversation-id="${fav.conversationId}"
           title="${fav.title}">
          <span class="semantix-favorite-star">${EXTRA_ICONS.starSmall}</span>
          <span class="semantix-favorite-title">${this.escapeHtml(fav.title)}</span>
          <span class="semantix-favorite-remove" data-remove-id="${fav.conversationId}" title="Remove from favorites">
            ${EXTRA_ICONS.x}
          </span>
        </a>
      `;
      })
      .join("");
  }

  /**
   * Create HTML for menu items (keeping for future use)
   * @returns {string}
   */
  createMenuItemsHTML() {
    return MENU_ITEMS.map(
      (item) => `
      <div class="${CLASSES.MENU_ITEM}" data-action="${item.action}" data-item-id="${item.id}">
        <div class="${CLASSES.MENU_ICON}">
          ${ICONS[item.icon] || ""}
        </div>
        <span class="${CLASSES.MENU_LABEL}">${item.label}</span>
      </div>
    `,
    ).join("");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EVENT HANDLING
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Bind event listeners
   */
  bindEvents() {
    if (!this.sectionElement) return;

    // Header click (toggle)
    const header = this.sectionElement.querySelector(`.${CLASSES.HEADER}`);
    if (header) {
      header.addEventListener("click", this.handleHeaderClick);
    }

    // Menu item clicks
    const menuItems = this.sectionElement.querySelectorAll(
      `.${CLASSES.MENU_ITEM}`,
    );
    menuItems.forEach((item) => {
      item.addEventListener("click", this.handleMenuItemClick);
    });

    // Favorite item clicks
    this.bindFavoriteClickEvents();
    this.bindFavoriteRemoveEvents();
  }

  /**
   * Bind click events to favorite items
   */
  bindFavoriteClickEvents() {
    if (!this.sectionElement) return;

    const favoriteItems = this.sectionElement.querySelectorAll(
      ".semantix-favorite-item",
    );
    favoriteItems.forEach((item) => {
      item.addEventListener("click", this.handleFavoriteClick);
    });
  }

  /**
   * Bind click events to remove buttons
   */
  bindFavoriteRemoveEvents() {
    if (!this.sectionElement) return;

    const removeButtons = this.sectionElement.querySelectorAll(
      ".semantix-favorite-remove",
    );
    removeButtons.forEach((btn) => {
      // Remove existing listener first
      btn.removeEventListener("click", this.handleFavoriteRemove);
      btn.addEventListener("click", this.handleFavoriteRemove);
    });
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
   * Handle header click (toggle collapsed state)
   * @param {Event} event
   */
  handleHeaderClick(event) {
    event.preventDefault();
    event.stopPropagation();

    this.toggleCollapsed();
  }

  /**
   * Handle menu item click
   * @param {Event} event
   */
  handleMenuItemClick(event) {
    event.preventDefault();
    event.stopPropagation();

    const target = event.currentTarget;
    const action = target.dataset.action;
    const itemId = target.dataset.itemId;

    console.log(
      `[SemantixSidebarWidget] Menu item clicked: ${itemId}, action: ${action}`,
    );

    // Dispatch custom event for external handling
    const customEvent = new CustomEvent("semantix-sidebar-action", {
      detail: { action, itemId },
      bubbles: true,
    });
    this.windowRef.dispatchEvent(customEvent);

    // Also send via postMessage for content script communication
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
   * Handle favorite item click (navigate)
   * @param {Event} event
   */
  handleFavoriteClick(event) {
    // Don't prevent default - let the link navigate
    // But stop propagation to parent handlers
    event.stopPropagation();

    const target = event.currentTarget;
    const conversationId = target.dataset.conversationId;

    console.log(`[SemantixSidebarWidget] Favorite clicked: ${conversationId}`);
  }

  /**
   * Handle favorite remove button click
   * @param {Event} event
   */
  async handleFavoriteRemove(event) {
    event.preventDefault();
    event.stopPropagation();

    const target = event.currentTarget;
    const conversationId = target.dataset.removeId;

    if (!conversationId) return;

    console.log(`[SemantixSidebarWidget] Removing favorite: ${conversationId}`);

    try {
      await this.favoritesManager.remove(conversationId);
      // List will update via the change listener
    } catch (error) {
      console.error(
        "[SemantixSidebarWidget] Failed to remove favorite:",
        error,
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STATE MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Toggle collapsed state
   */
  toggleCollapsed() {
    this.isCollapsed = !this.isCollapsed;
    this.updateCollapsedUI();
    this.saveCollapsedState();

    console.log(`[SemantixSidebarWidget] Collapsed: ${this.isCollapsed}`);
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
      console.log(
        `[SemantixSidebarWidget] Loaded collapsed state: ${this.isCollapsed}`,
      );
    } catch (e) {
      console.warn(
        "[SemantixSidebarWidget] Failed to load collapsed state:",
        e,
      );
      this.isCollapsed = CONFIG.DEFAULT_COLLAPSED;
    }
  }

  /**
   * Save collapsed state to storage
   */
  saveCollapsedState() {
    try {
      localStorage.setItem(CONFIG.STORAGE_KEY, String(this.isCollapsed));
    } catch (e) {
      console.warn(
        "[SemantixSidebarWidget] Failed to save collapsed state:",
        e,
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MUTATION OBSERVER
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Set up mutation observer to handle dynamic DOM changes
   */
  setupObserver() {
    if (this.observer) {
      this.observer.disconnect();
    }

    let debounceTimer = null;

    this.observer = new MutationObserver((mutations) => {
      // Debounce to avoid excessive processing
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      debounceTimer = setTimeout(() => {
        this.handleMutations(mutations);
      }, CONFIG.DEBOUNCE_DELAY);
    });

    // Observe the body for sidebar changes
    this.observer.observe(this.documentRef.body, {
      childList: true,
      subtree: true,
    });

    console.log("[SemantixSidebarWidget] Mutation observer set up");
  }

  /**
   * Handle mutations (re-inject if needed)
   * @param {MutationRecord[]} mutations
   */
  handleMutations(mutations) {
    // Check if our section still exists
    if (
      this.sectionElement &&
      !this.documentRef.body.contains(this.sectionElement)
    ) {
      console.log("[SemantixSidebarWidget] Section removed, re-injecting...");
      this.isInjected = false;
      this.sectionElement = null;
      this.retryCount = 0;
      this.tryInject();
      return;
    }

    // If not injected, try to inject
    if (!this.isInjected) {
      this.tryInject();
    }

    // Check if URL changed (conversation switch) and update active state
    const currentId = this.getCurrentConversationId();
    const activeItem = this.sectionElement?.querySelector(
      ".semantix-favorite-item.active",
    );
    const activeId = activeItem?.dataset?.conversationId;

    if (currentId !== activeId) {
      this.updateFavoritesList();
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create and initialize a SemantixSidebarWidget instance
 * @param {Object} options
 * @returns {SemantixSidebarWidget}
 */
export function createSemantixSidebarWidget(options = {}) {
  const widget = new SemantixSidebarWidget(options);
  widget.init();
  return widget;
}

export default SemantixSidebarWidget;
