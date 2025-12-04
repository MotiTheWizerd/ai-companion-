import { GPT_SELECTORS, ICONS, CLASSES, CONFIG } from "./constants.js";
import { getFavoritesManager } from "../../SemantixStorage/index.js";

/**
 * FavoriteButton Component
 * Injects a star/favorite button into ChatGPT's chat header toolbar
 * (next to Share, Add people buttons)
 *
 * Now wired to FavoritesManager for persistent storage!
 */

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const BUTTON_STYLES = `
/* Favorite Button - Matches ChatGPT's header button styling */
.${CLASSES.FAVORITE_BTN} {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-primary, #ececec);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
  white-space: nowrap;
}

.${CLASSES.FAVORITE_BTN}:hover {
  background-color: var(--surface-secondary, rgba(255, 255, 255, 0.1));
}

.${CLASSES.FAVORITE_BTN} svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

/* Active/Favorited state */
.${CLASSES.FAVORITE_BTN}.${CLASSES.FAVORITE_BTN_ACTIVE} {
  color: #f5a623;
}

.${CLASSES.FAVORITE_BTN}.${CLASSES.FAVORITE_BTN_ACTIVE} svg {
  fill: #f5a623;
  stroke: #f5a623;
}

/* Hover effect on active */
.${CLASSES.FAVORITE_BTN}.${CLASSES.FAVORITE_BTN_ACTIVE}:hover {
  background-color: rgba(245, 166, 35, 0.1);
}

/* Loading state */
.${CLASSES.FAVORITE_BTN}.semantix-favorite-btn--loading {
  opacity: 0.6;
  pointer-events: none;
}
`;

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class FavoriteButton {
  constructor(options = {}) {
    this.documentRef = options.document || document;
    this.windowRef = options.window || window;
    this.onFavorite = options.onFavorite || null;

    this.isInjected = false;
    this.buttonElement = null;
    this.isFavorited = false;
    this.isLoading = false;
    this.observer = null;
    this.retryCount = 0;
    this.retryTimeout = null;
    this.currentConversationId = null;

    // FavoritesManager instance
    this.favoritesManager = getFavoritesManager({ provider: "chatgpt" });

    // Bound handlers
    this.handleClick = this.handleClick.bind(this);
    this.handleNavigation = this.handleNavigation.bind(this);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LIFECYCLE
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Initialize the component
   */
  async init() {
    console.log("[FavoriteButton] Initializing...");

    // Inject styles
    this.injectStyles();

    // Try to inject the button
    this.tryInject();

    // Set up mutation observer for dynamic content
    this.setupObserver();

    // Listen for navigation changes to update button state
    this.windowRef.addEventListener("popstate", this.handleNavigation);

    // Check initial favorite state
    await this.checkFavoriteState();

    console.log("[FavoriteButton] Initialized");
  }

  /**
   * Clean up the component
   */
  destroy() {
    console.log("[FavoriteButton] Destroying...");

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

    // Remove event listeners
    this.windowRef.removeEventListener("popstate", this.handleNavigation);

    // Remove button element
    if (this.buttonElement) {
      this.buttonElement.removeEventListener("click", this.handleClick);
      this.buttonElement.remove();
      this.buttonElement = null;
    }

    // Remove styles
    const styleElement = this.documentRef.getElementById(
      "semantix-favorite-btn-styles",
    );
    if (styleElement) {
      styleElement.remove();
    }

    this.isInjected = false;
    console.log("[FavoriteButton] Destroyed");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INJECTION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Inject CSS styles into the document
   */
  injectStyles() {
    if (this.documentRef.getElementById("semantix-favorite-btn-styles")) {
      return;
    }

    const styleElement = this.documentRef.createElement("style");
    styleElement.id = "semantix-favorite-btn-styles";
    styleElement.textContent = BUTTON_STYLES;
    this.documentRef.head.appendChild(styleElement);

    console.log("[FavoriteButton] Styles injected");
  }

  /**
   * Try to inject the button, with retries
   */
  tryInject() {
    if (
      this.isInjected &&
      this.buttonElement &&
      this.documentRef.body.contains(this.buttonElement)
    ) {
      console.log("[FavoriteButton] Already injected, skipping");
      return;
    }

    // Reset state if button was removed
    if (
      this.isInjected &&
      (!this.buttonElement ||
        !this.documentRef.body.contains(this.buttonElement))
    ) {
      this.isInjected = false;
      this.buttonElement = null;
    }

    const success = this.inject();

    if (!success && this.retryCount < CONFIG.MAX_RETRIES) {
      this.retryCount++;
      console.log(
        `[FavoriteButton] Injection failed, retry ${this.retryCount}/${CONFIG.MAX_RETRIES}`,
      );
      this.retryTimeout = setTimeout(
        () => this.tryInject(),
        CONFIG.RETRY_INTERVAL,
      );
    } else if (!success) {
      console.log(
        "[FavoriteButton] Max retries reached, waiting for mutation...",
      );
      this.retryCount = 0; // Reset for next mutation trigger
    }
  }

  /**
   * Find the chat header actions container
   * @returns {Element|null}
   */
  findHeaderActions() {
    const selectors = GPT_SELECTORS.CHAT_HEADER_ACTIONS;

    for (const selector of selectors) {
      try {
        const element = this.documentRef.querySelector(selector);
        if (element) {
          console.log(
            `[FavoriteButton] Found header actions with selector: ${selector}`,
          );
          return element;
        }
      } catch (e) {
        console.warn(`[FavoriteButton] Invalid selector: ${selector}`, e);
      }
    }

    return null;
  }

  /**
   * Inject the favorite button into the header
   * @returns {boolean} Success
   */
  inject() {
    // Check if already exists
    const existing = this.documentRef.querySelector(`.${CLASSES.FAVORITE_BTN}`);
    if (existing) {
      console.log("[FavoriteButton] Button already exists");
      this.buttonElement = existing;
      this.isInjected = true;
      this.bindEvents();
      return true;
    }

    // Find the header actions container
    const headerActions = this.findHeaderActions();
    if (!headerActions) {
      console.log("[FavoriteButton] Header actions container not found");
      return false;
    }

    // Create the button element
    this.buttonElement = this.createButtonElement();

    // Insert as first child (before Share button)
    headerActions.insertBefore(this.buttonElement, headerActions.firstChild);

    // Bind events
    this.bindEvents();

    this.isInjected = true;
    this.retryCount = 0;
    console.log("[FavoriteButton] Button injected successfully");

    // Check favorite state after injection
    this.checkFavoriteState();

    return true;
  }

  /**
   * Create the button DOM element
   * @returns {HTMLButtonElement}
   */
  createButtonElement() {
    const button = this.documentRef.createElement("button");
    button.className = `${CLASSES.FAVORITE_BTN} btn relative btn-ghost text-token-text-primary`;
    button.setAttribute("aria-label", "Add to favorites");
    button.setAttribute("data-testid", "favorite-chat-button");

    button.innerHTML = `
      <div class="flex w-full items-center justify-center gap-1.5">
        ${ICONS.star}
        <span>Favorite</span>
      </div>
    `;

    return button;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EVENT HANDLING
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Bind event listeners
   */
  bindEvents() {
    if (!this.buttonElement) return;

    // Remove existing listener first to avoid duplicates
    this.buttonElement.removeEventListener("click", this.handleClick);
    this.buttonElement.addEventListener("click", this.handleClick);
  }

  /**
   * Handle button click - toggle favorite using FavoritesManager
   * @param {Event} event
   */
  async handleClick(event) {
    event.preventDefault();
    event.stopPropagation();

    if (this.isLoading) {
      console.log("[FavoriteButton] Already processing, ignoring click");
      return;
    }

    const conversationId = this.getConversationId();
    if (!conversationId) {
      console.warn("[FavoriteButton] No conversation ID found");
      return;
    }

    console.log("[FavoriteButton] Toggling favorite for:", conversationId);

    // Set loading state
    this.setLoading(true);

    try {
      // Get chat title
      const title = this.getChatTitle();

      // Toggle favorite using FavoritesManager
      const result = await this.favoritesManager.toggle({
        conversationId,
        title,
        url: this.windowRef.location.href,
      });

      // Update UI state
      this.isFavorited = result.isFavorite;
      this.updateButtonUI();

      console.log(
        `[FavoriteButton] Favorite toggled: ${result.isFavorite ? "added" : "removed"}`,
      );

      // Dispatch custom event
      const customEvent = new CustomEvent("semantix-favorite-click", {
        detail: {
          isFavorited: this.isFavorited,
          conversationId,
          item: result.item,
        },
        bubbles: true,
      });
      this.windowRef.dispatchEvent(customEvent);

      // Call callback if provided
      if (this.onFavorite) {
        this.onFavorite({
          isFavorited: this.isFavorited,
          conversationId,
          item: result.item,
        });
      }

      // Also send via postMessage for content script communication
      this.windowRef.postMessage(
        {
          source: "semantix-favorite",
          type: "FAVORITE_TOGGLE",
          isFavorited: this.isFavorited,
          conversationId,
          item: result.item,
        },
        "*",
      );
    } catch (error) {
      console.error("[FavoriteButton] Failed to toggle favorite:", error);
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Handle navigation changes
   */
  async handleNavigation() {
    console.log(
      "[FavoriteButton] Navigation detected, checking favorite state",
    );

    // Small delay to let URL update
    setTimeout(async () => {
      await this.checkFavoriteState();
    }, 100);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STATE MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Check if current conversation is favorited and update UI
   */
  async checkFavoriteState() {
    const conversationId = this.getConversationId();

    if (!conversationId) {
      console.log("[FavoriteButton] No conversation ID, skipping state check");
      this.isFavorited = false;
      this.updateButtonUI();
      return;
    }

    // Check if conversation changed
    if (conversationId !== this.currentConversationId) {
      this.currentConversationId = conversationId;
      console.log("[FavoriteButton] Conversation changed to:", conversationId);
    }

    try {
      this.isFavorited = await this.favoritesManager.isFavorite(conversationId);
      console.log(
        `[FavoriteButton] Favorite state for ${conversationId}: ${this.isFavorited}`,
      );
      this.updateButtonUI();
    } catch (error) {
      console.error("[FavoriteButton] Failed to check favorite state:", error);
      this.isFavorited = false;
      this.updateButtonUI();
    }
  }

  /**
   * Set loading state
   * @param {boolean} loading
   */
  setLoading(loading) {
    this.isLoading = loading;

    if (this.buttonElement) {
      if (loading) {
        this.buttonElement.classList.add("semantix-favorite-btn--loading");
      } else {
        this.buttonElement.classList.remove("semantix-favorite-btn--loading");
      }
    }
  }

  /**
   * Update button UI based on favorited state
   */
  updateButtonUI() {
    if (!this.buttonElement) return;

    if (this.isFavorited) {
      this.buttonElement.classList.add(CLASSES.FAVORITE_BTN_ACTIVE);
      this.buttonElement.setAttribute("aria-label", "Remove from favorites");
      this.buttonElement.querySelector("div").innerHTML = `
        ${ICONS.starFilled}
        <span>Favorited</span>
      `;
    } else {
      this.buttonElement.classList.remove(CLASSES.FAVORITE_BTN_ACTIVE);
      this.buttonElement.setAttribute("aria-label", "Add to favorites");
      this.buttonElement.querySelector("div").innerHTML = `
        ${ICONS.star}
        <span>Favorite</span>
      `;
    }
  }

  /**
   * Get current conversation ID from URL
   * @returns {string|null}
   */
  getConversationId() {
    const match =
      this.windowRef.location.pathname.match(/\/c\/([a-zA-Z0-9-]+)/);
    return match ? match[1] : null;
  }

  /**
   * Get current chat title from page
   * @returns {string}
   */
  getChatTitle() {
    // Try to get title from document title (usually "Chat Title - ChatGPT")
    const docTitle = this.documentRef.title;
    if (docTitle && docTitle !== "ChatGPT") {
      const titleParts = docTitle.split(" - ");
      if (titleParts.length > 0 && titleParts[0] !== "ChatGPT") {
        return titleParts[0].trim();
      }
    }

    // Fallback: try to get from active chat in sidebar
    const activeChat = this.documentRef.querySelector(
      'a[data-sidebar-item="true"][data-active] .truncate span',
    );
    if (activeChat?.textContent) {
      return activeChat.textContent.trim();
    }

    // Final fallback
    return "Untitled Chat";
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

    // Observe the body for header changes
    this.observer.observe(this.documentRef.body, {
      childList: true,
      subtree: true,
    });

    console.log("[FavoriteButton] Mutation observer set up");
  }

  /**
   * Handle mutations (re-inject if needed)
   * @param {MutationRecord[]} mutations
   */
  handleMutations(mutations) {
    // Check if our button still exists
    if (
      this.buttonElement &&
      !this.documentRef.body.contains(this.buttonElement)
    ) {
      console.log("[FavoriteButton] Button removed, re-injecting...");
      this.isInjected = false;
      this.buttonElement = null;
      this.retryCount = 0;
      this.tryInject();
      return;
    }

    // If not injected, try to inject (header might have appeared)
    if (!this.isInjected) {
      this.tryInject();
    }

    // Check if conversation changed (URL might have changed via SPA navigation)
    const currentId = this.getConversationId();
    if (currentId && currentId !== this.currentConversationId) {
      console.log("[FavoriteButton] Detected conversation change via mutation");
      this.checkFavoriteState();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Set favorited state programmatically
   * @param {boolean} isFavorited
   */
  setFavorited(isFavorited) {
    this.isFavorited = isFavorited;
    this.updateButtonUI();
  }

  /**
   * Check if current chat is favorited
   * @returns {boolean}
   */
  getFavorited() {
    return this.isFavorited;
  }

  /**
   * Get the FavoritesManager instance
   * @returns {FavoritesManager}
   */
  getFavoritesManager() {
    return this.favoritesManager;
  }

  /**
   * Refresh favorite state from storage
   */
  async refresh() {
    await this.checkFavoriteState();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create and initialize a FavoriteButton instance
 * @param {Object} options
 * @returns {FavoriteButton}
 */
export function createFavoriteButton(options = {}) {
  const button = new FavoriteButton(options);
  button.init();
  return button;
}

export default FavoriteButton;
