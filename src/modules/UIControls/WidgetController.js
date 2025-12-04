import { SemantixWidgets } from "../SemantixUIComponents/index.js";
import { eventBus } from "../../content/core/eventBus.js";
import { EmojiWidget } from "../widgets/emoji-widget/EmojiWidget.js";
import { QuickJumpWidget } from "../widgets/quick-jump-widget/QuickJumpWidget.js";
import { RTLDetectWidget } from "../widgets/rtl-detect-widget/RTLDetectWidget.js";
import { ReflectionSlotWidget } from "../widgets/reflection-slot-widget/ReflectionSlotWidget.js";
import { SemantixSidebarWidget } from "../widgets/semantix-sidebar-widget/SemantixSidebarWidget.js";
import { FavoriteButton } from "../widgets/semantix-sidebar-widget/FavoriteButton.js";
import { ChatHistorySelector } from "../ChatHistorySelector/index.js";
import { getFavoritesManager } from "../SemantixStorage/index.js";
import { RetryManager } from "./utils/RetryManager.js";

/**
 * Injects Semantix widgets near the provider composer
 */
export class WidgetController {
  constructor(conversationManager) {
    this.conversationManager = conversationManager;
    this.isInitialized = false;
    this.widgetElement = null;
    this.retryManager = new RetryManager();
    this.lifecycleHandlers = null;
    this.emojiWidget = null;
    this.quickJumpWidget = null;
    this.rtlDetectWidget = null;
    this.reflectionSlotWidget = null;
    this.semantixSidebarWidget = null;
    this.favoriteButton = null;
    this.chatHistorySelector = null;
  }

  init() {
    if (this.isInitialized) return;
    if (!this.conversationManager) {
      console.warn("[WidgetController] Missing conversation manager");
      return;
    }
    this.registerLifecycleListeners();
    this.isInitialized = true;
  }

  registerLifecycleListeners() {
    if (this.lifecycleHandlers) return;
    this.lifecycleHandlers = {
      domReady: (detail) => this.handleDomReady(detail),
      hostMutation: (detail) => this.handleHostMutation(detail),
      navigation: (detail) => this.handleNavigation(detail),
    };
    eventBus.on("lifecycle:dom-ready", this.lifecycleHandlers.domReady);
    eventBus.on("lifecycle:host-mutation", this.lifecycleHandlers.hostMutation);
    eventBus.on("lifecycle:navigation", this.lifecycleHandlers.navigation);
  }

  handleDomReady(detail) {
    console.log("[WidgetController] handleDomReady triggered");
    this.logDebug("lifecycle:dom-ready", { detail });
    this.tryInjectWithRetry("dom-ready");
    this.initQuickJump();
    this.initSemantixSidebar();
    this.initFavoriteButton();
    this.initChatHistorySelector();
  }

  handleHostMutation(detail) {
    this.logDebug("lifecycle:host-mutation", { detail });
    // Try to init QuickJump if not already initialized
    this.initQuickJump();
    // Try to init RTL detection
    this.initRTLDetect();
    // Try to init ReflectionSlot
    this.initReflectionSlot();
    // Try to init Semantix Sidebar
    this.initSemantixSidebar();
    // Try to init Favorite Button
    this.initFavoriteButton();
    // Try to init Chat History Selector
    this.initChatHistorySelector();

    if (this.widgetElement && document.body.contains(this.widgetElement)) {
      return;
    }
    this.tryInjectWithRetry("host-mutation");
  }

  handleNavigation(detail) {
    this.logDebug("lifecycle:navigation", { detail });
    this.destroyWidget();
    this.tryInjectWithRetry("navigation");
    // Re-initialize QuickJump for new conversation
    this.destroyQuickJump();
    this.initQuickJump();
    // Re-initialize ReflectionSlot for new conversation
    this.destroyReflectionSlot();
    this.initReflectionSlot();
    // Re-initialize Semantix Sidebar (in case sidebar was rebuilt)
    this.initSemantixSidebar();
    // Re-initialize Favorite Button for new conversation
    this.destroyFavoriteButton();
    this.initFavoriteButton();
  }

  tryInjectWithRetry(reason = "manual") {
    this.logDebug("attempt:start", { detail: { reason } });
    const injected = this.attemptInjection();
    if (injected) {
      this.retryManager.cancel();
      this.logDebug("attempt:success", { detail: { reason } });
      return true;
    }
    this.logDebug("attempt:pending", { detail: { reason } });
    this.retryManager.schedule(() => this.tryInjectWithRetry("retry"));
    return false;
  }

  attemptInjection() {
    if (!document.body) {
      this.logDebug("attempt:blocked", { detail: { reason: "no-body" } });
      return false;
    }

    if (this.widgetElement) {
      if (document.body.contains(this.widgetElement)) {
        this.logDebug("attempt:skipped", {
          detail: { reason: "already-present" },
        });
        return true;
      }
      this.widgetElement = null;
    }

    const selectors = this.conversationManager?.getSelectors();
    if (!selectors || !selectors.getWidgetContainer) {
      this.logDebug("attempt:blocked", {
        detail: { reason: "missing-selectors" },
      });
      return false;
    }

    const widgetSelector = selectors.getWidgetContainer();
    if (!widgetSelector) {
      this.logDebug("attempt:blocked", { detail: { reason: "no-selector" } });
      return false;
    }

    const selectorList = Array.isArray(widgetSelector)
      ? widgetSelector.filter(Boolean)
      : [widgetSelector];

    let targetElement = null;
    for (const selector of selectorList) {
      if (!selector || typeof selector !== "string") continue;
      try {
        targetElement = document.querySelector(selector);
      } catch (error) {
        console.warn(
          "[WidgetController] Invalid widget selector, skipping:",
          selector,
          error,
        );
        continue;
      }
      if (targetElement) {
        this.logDebug("attempt:target-found", { detail: { selector } });
        break;
      }
    }

    const existing = document.querySelector(".semantix-widgets");

    if (existing) {
      this.widgetElement = existing;
      this.bindActions();
      this.logDebug("attempt:attached-existing");
      return true;
    }

    if (!targetElement) {
      this.logDebug("attempt:waiting", {
        detail: { reason: "target-missing" },
      });
      return false;
    }

    const widgetPosition = selectors.getWidgetPosition
      ? selectors.getWidgetPosition()
      : "append";
    return this.injectWidget(targetElement, widgetPosition);
  }

  injectWidget(targetElement, position = "append") {
    const container = document.createElement("div");
    container.innerHTML = SemantixWidgets().trim();
    const widget = container.firstElementChild;

    if (!widget) {
      console.warn("[WidgetController] Failed to build widget template");
      this.logDebug("attempt:error", { detail: { reason: "template-failed" } });
      return false;
    }

    switch (position) {
      case "before":
        if (targetElement.parentNode) {
          targetElement.parentNode.insertBefore(widget, targetElement);
        } else {
          targetElement.appendChild(widget);
        }
        break;
      case "after":
        if (targetElement.parentNode) {
          targetElement.parentNode.insertBefore(
            widget,
            targetElement.nextSibling,
          );
        } else {
          targetElement.appendChild(widget);
        }
        break;
      case "prepend":
        targetElement.insertBefore(widget, targetElement.firstChild);
        break;
      case "append":
      default:
        targetElement.appendChild(widget);
        break;
    }

    this.widgetElement = widget;
    this.bindActions();
    this.logDebug("attempt:injected", { detail: { position } });
    return true;
  }

  bindActions() {
    if (!this.widgetElement) return;
    const importBtn = this.widgetElement.querySelector(
      '[data-widget-action="import"]',
    );
    const emojiBtn = this.widgetElement.querySelector(
      '[data-widget-action="emoji"]',
    );

    if (importBtn) {
      importBtn.addEventListener("click", (event) => {
        event.preventDefault();
        eventBus.emit("import:chat", { source: "widgets-panel" });
      });
    }

    if (emojiBtn) {
      emojiBtn.addEventListener("click", (event) => {
        event.preventDefault();
        const widget = this.getEmojiWidget();
        widget.toggle(emojiBtn);
      });
    }
  }

  getEmojiWidget() {
    if (!this.emojiWidget) {
      this.emojiWidget = new EmojiWidget({
        onSelect: (emoji) => {
          eventBus.emit("emoji:selected", {
            source: "widgets-panel",
            emoji,
          });
        },
        document: document,
      });
      this.emojiWidget.attach();
    }
    return this.emojiWidget;
  }

  /**
   * Initialize QuickJump widget (GPT only for now)
   */
  initQuickJump() {
    console.log("[WidgetController] initQuickJump() called");

    // Only init if not already present
    if (this.quickJumpWidget) {
      console.log("[WidgetController] QuickJump already exists, skipping");
      return;
    }

    // Check if we're on a GPT page (provider check)
    const isGPT =
      window.location.hostname.includes("chatgpt.com") ||
      window.location.hostname.includes("chat.openai.com");

    console.log(
      "[WidgetController] Hostname:",
      window.location.hostname,
      "isGPT:",
      isGPT,
    );

    if (!isGPT) {
      console.log("[WidgetController] Not GPT page, skipping QuickJump");
      this.logDebug("quickjump:skipped", { detail: { reason: "not-gpt" } });
      return;
    }

    console.log("[WidgetController] Creating QuickJumpWidget...");
    this.quickJumpWidget = new QuickJumpWidget({
      document: document,
      maxDots: 20,
    });
    this.quickJumpWidget.attach();
    console.log("[WidgetController] QuickJumpWidget attached");
    this.logDebug("quickjump:initialized");
  }

  /**
   * Destroy QuickJump widget
   */
  destroyQuickJump() {
    if (this.quickJumpWidget) {
      this.quickJumpWidget.destroy();
      this.quickJumpWidget = null;
      this.logDebug("quickjump:destroyed");
    }
  }

  /**
   * Initialize RTL Detect widget (GPT only for now)
   */
  initRTLDetect() {
    console.log("[WidgetController] initRTLDetect() called");

    // Only init if not already present
    if (this.rtlDetectWidget) {
      console.log("[WidgetController] RTLDetect already exists, skipping");
      return;
    }

    // Check if we're on a GPT page (provider check)
    const isGPT =
      window.location.hostname.includes("chatgpt.com") ||
      window.location.hostname.includes("chat.openai.com");

    if (!isGPT) {
      console.log("[WidgetController] Not GPT page, skipping RTLDetect");
      this.logDebug("rtldetect:skipped", { detail: { reason: "not-gpt" } });
      return;
    }

    console.log("[WidgetController] Creating RTLDetectWidget...");
    this.rtlDetectWidget = new RTLDetectWidget({
      document: document,
      inputSelector: "#prompt-textarea",
    });
    this.rtlDetectWidget.attach();
    console.log("[WidgetController] RTLDetectWidget attached");
    this.logDebug("rtldetect:initialized");
  }

  /**
   * Destroy RTL Detect widget
   */
  destroyRTLDetect() {
    if (this.rtlDetectWidget) {
      this.rtlDetectWidget.destroy();
      this.rtlDetectWidget = null;
      this.logDebug("rtldetect:destroyed");
    }
  }

  /**
   * Initialize ReflectionSlot widget (GPT only for now)
   */
  initReflectionSlot() {
    console.log("[WidgetController] initReflectionSlot() called");

    // Only init if not already present
    if (this.reflectionSlotWidget) {
      console.log("[WidgetController] ReflectionSlot already exists, skipping");
      return;
    }

    // Check if we're on a GPT page (provider check)
    const isGPT =
      window.location.hostname.includes("chatgpt.com") ||
      window.location.hostname.includes("chat.openai.com");

    if (!isGPT) {
      console.log("[WidgetController] Not GPT page, skipping ReflectionSlot");
      this.logDebug("reflectionslot:skipped", {
        detail: { reason: "not-gpt" },
      });
      return;
    }

    console.log("[WidgetController] Creating ReflectionSlotWidget...");
    this.reflectionSlotWidget = new ReflectionSlotWidget({
      document: document,
      onSlotCreated: ({ slotElement, messageElement, messageId }) => {
        console.log(
          "[WidgetController] ReflectionSlot created for message:",
          messageId,
        );
        this.logDebug("reflectionslot:slot-created", { detail: { messageId } });
      },
      onSlotRemoved: ({ messageId }) => {
        console.log(
          "[WidgetController] ReflectionSlot removed for message:",
          messageId,
        );
        this.logDebug("reflectionslot:slot-removed", { detail: { messageId } });
      },
    });
    this.reflectionSlotWidget.attach();
    console.log("[WidgetController] ReflectionSlotWidget attached");
    this.logDebug("reflectionslot:initialized");
  }

  /**
   * Destroy ReflectionSlot widget
   */
  destroyReflectionSlot() {
    if (this.reflectionSlotWidget) {
      this.reflectionSlotWidget.destroy();
      this.reflectionSlotWidget = null;
      this.logDebug("reflectionslot:destroyed");
    }
  }

  /**
   * Get ReflectionSlot widget instance (for external access)
   */
  getReflectionSlotWidget() {
    return this.reflectionSlotWidget;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SEMANTIX SIDEBAR WIDGET
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Initialize Semantix Sidebar widget (GPT only)
   */
  initSemantixSidebar() {
    console.log("[WidgetController] initSemantixSidebar() called");

    // Only init if not already present
    if (this.semantixSidebarWidget) {
      console.log(
        "[WidgetController] SemantixSidebar already exists, skipping",
      );
      return;
    }

    // Check if we're on a GPT page (provider check)
    const isGPT =
      window.location.hostname.includes("chatgpt.com") ||
      window.location.hostname.includes("chat.openai.com");

    if (!isGPT) {
      console.log("[WidgetController] Not GPT page, skipping SemantixSidebar");
      this.logDebug("semantixsidebar:skipped", {
        detail: { reason: "not-gpt" },
      });
      return;
    }

    console.log("[WidgetController] Creating SemantixSidebarWidget...");
    this.semantixSidebarWidget = new SemantixSidebarWidget({
      document: document,
      window: window,
    });
    this.semantixSidebarWidget.init();
    console.log("[WidgetController] SemantixSidebarWidget initialized");
    this.logDebug("semantixsidebar:initialized");

    // Listen for sidebar menu actions
    this.setupSidebarActionListeners();
  }

  /**
   * Setup listeners for Semantix Sidebar menu actions
   */
  setupSidebarActionListeners() {
    window.addEventListener("semantix-sidebar-action", (event) => {
      const { action, itemId } = event.detail;
      console.log(
        `[WidgetController] Sidebar action: ${action}, item: ${itemId}`,
      );

      switch (action) {
        case "openFavorites":
          eventBus.emit("semantix:open-favorites", { source: "sidebar" });
          break;
        default:
          console.log(`[WidgetController] Unknown sidebar action: ${action}`);
      }
    });
  }

  /**
   * Destroy Semantix Sidebar widget
   */
  destroySemantixSidebar() {
    if (this.semantixSidebarWidget) {
      this.semantixSidebarWidget.destroy();
      this.semantixSidebarWidget = null;
      this.logDebug("semantixsidebar:destroyed");
    }
  }

  /**
   * Get Semantix Sidebar widget instance (for external access)
   */
  getSemantixSidebarWidget() {
    return this.semantixSidebarWidget;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FAVORITE BUTTON
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Initialize Favorite Button (GPT only)
   */
  initFavoriteButton() {
    console.log("[WidgetController] initFavoriteButton() called");

    // Only init if not already present
    if (this.favoriteButton) {
      console.log("[WidgetController] FavoriteButton already exists, skipping");
      return;
    }

    // Check if we're on a GPT page
    const isGPT =
      window.location.hostname.includes("chatgpt.com") ||
      window.location.hostname.includes("chat.openai.com");

    if (!isGPT) {
      console.log("[WidgetController] Not GPT page, skipping FavoriteButton");
      this.logDebug("favoritebutton:skipped", {
        detail: { reason: "not-gpt" },
      });
      return;
    }

    console.log("[WidgetController] Creating FavoriteButton...");
    this.favoriteButton = new FavoriteButton({
      document: document,
      window: window,
      onFavorite: ({ isFavorited, conversationId, item }) => {
        console.log(
          `[WidgetController] Favorite callback: ${conversationId}, favorited: ${isFavorited}`,
        );
        eventBus.emit("semantix:favorite-toggle", {
          source: "header-button",
          isFavorited,
          conversationId,
          item,
        });
      },
    });
    this.favoriteButton.init();
    console.log("[WidgetController] FavoriteButton initialized");
    this.logDebug("favoritebutton:initialized");

    // Expose FavoritesManager globally for debugging
    const favoritesManager = getFavoritesManager({ provider: "chatgpt" });
    window.semantixFavorites = {
      getAll: () => favoritesManager.getAll(),
      isFavorite: (id) => favoritesManager.isFavorite(id),
      add: (params) => favoritesManager.add(params),
      remove: (id) => favoritesManager.remove(id),
      toggle: (params) => favoritesManager.toggle(params),
      search: (query) => favoritesManager.search(query),
      count: () => favoritesManager.count(),
      debug: () => favoritesManager.debug(),
      clear: () => favoritesManager.clearAll(),
    };
    console.log(
      "[WidgetController] Exposed window.semantixFavorites for debugging",
    );
  }

  /**
   * Destroy Favorite Button
   */
  destroyFavoriteButton() {
    if (this.favoriteButton) {
      this.favoriteButton.destroy();
      this.favoriteButton = null;
      delete window.semantixFavorites;
      this.logDebug("favoritebutton:destroyed");
    }
  }

  /**
   * Get Favorite Button instance (for external access)
   */
  getFavoriteButton() {
    return this.favoriteButton;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAT HISTORY SELECTOR
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Initialize Chat History Selector (GPT only)
   */
  initChatHistorySelector() {
    console.log("[WidgetController] initChatHistorySelector() called");

    // Only init if not already present
    if (this.chatHistorySelector) {
      console.log(
        "[WidgetController] ChatHistorySelector already exists, skipping",
      );
      return;
    }

    // Check if we're on a GPT page
    const isGPT =
      window.location.hostname.includes("chatgpt.com") ||
      window.location.hostname.includes("chat.openai.com");

    if (!isGPT) {
      console.log(
        "[WidgetController] Not GPT page, skipping ChatHistorySelector",
      );
      this.logDebug("chathistoryselector:skipped", {
        detail: { reason: "not-gpt" },
      });
      return;
    }

    console.log("[WidgetController] Creating ChatHistorySelector...");
    this.chatHistorySelector = new ChatHistorySelector({
      document: document,
      window: window,
      onActiveChatChanged: ({ previousId, currentId, chat }) => {
        console.log(
          `[WidgetController] Active chat changed: ${previousId} -> ${currentId}`,
        );
        eventBus.emit("semantix:active-chat-changed", {
          source: "chat-history-selector",
          previousId,
          currentId,
          chat: chat?.toObject() || null,
        });
      },
      onChatAdded: ({ conversationId, chat }) => {
        console.log(`[WidgetController] Chat added: ${conversationId}`);
        eventBus.emit("semantix:chat-added", {
          source: "chat-history-selector",
          conversationId,
          chat: chat?.toObject() || null,
        });
      },
      onChatRemoved: ({ conversationId }) => {
        console.log(`[WidgetController] Chat removed: ${conversationId}`);
        eventBus.emit("semantix:chat-removed", {
          source: "chat-history-selector",
          conversationId,
        });
      },
    });
    this.chatHistorySelector.init();
    console.log("[WidgetController] ChatHistorySelector initialized");
    this.logDebug("chathistoryselector:initialized");

    // Expose debug method globally for testing
    window.semantixChatHistory = {
      debug: () => this.chatHistorySelector.debug(),
      getActiveChat: () => this.chatHistorySelector.getActiveChat()?.toObject(),
      getAllChats: () =>
        this.chatHistorySelector.getAllChats().map((c) => c.toObject()),
      findChatById: (id) =>
        this.chatHistorySelector.findChatById(id)?.toObject(),
    };
    console.log(
      "[WidgetController] Exposed window.semantixChatHistory for debugging",
    );
  }

  /**
   * Destroy Chat History Selector
   */
  destroyChatHistorySelector() {
    if (this.chatHistorySelector) {
      this.chatHistorySelector.destroy();
      this.chatHistorySelector = null;
      delete window.semantixChatHistory;
      this.logDebug("chathistoryselector:destroyed");
    }
  }

  /**
   * Get Chat History Selector instance (for external access)
   */
  getChatHistorySelector() {
    return this.chatHistorySelector;
  }

  destroyWidget() {
    if (this.widgetElement && this.widgetElement.parentNode) {
      this.widgetElement.remove();
    }
    this.widgetElement = null;
    if (this.emojiWidget) {
      this.emojiWidget.close();
      this.emojiWidget = null;
    }
    this.destroyQuickJump();
    this.destroyRTLDetect();
    this.destroyReflectionSlot();
    this.destroySemantixSidebar();
    this.destroyFavoriteButton();
    this.destroyChatHistorySelector();
    this.retryManager.cancel();
  }

  logDebug(stage, detail = {}) {
    eventBus.emit("debug:widget", { stage, detail });
  }
}
