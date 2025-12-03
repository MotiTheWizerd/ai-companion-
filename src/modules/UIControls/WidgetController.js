import { SemantixWidgets } from "../SemantixUIComponents/index.js";
import { eventBus } from "../../content/core/eventBus.js";
import { EmojiWidget } from "../widgets/emoji-widget/EmojiWidget.js";
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
    this.logDebug("lifecycle:dom-ready", { detail });
    this.tryInjectWithRetry("dom-ready");
  }

  handleHostMutation(detail) {
    this.logDebug("lifecycle:host-mutation", { detail });
    if (this.widgetElement && document.body.contains(this.widgetElement)) {
      return;
    }
    this.tryInjectWithRetry("host-mutation");
  }

  handleNavigation(detail) {
    this.logDebug("lifecycle:navigation", { detail });
    this.destroyWidget();
    this.tryInjectWithRetry("navigation");
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
      this.logDebug("attempt:waiting", { detail: { reason: "target-missing" } });
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
          targetElement.parentNode.insertBefore(widget, targetElement.nextSibling);
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

  destroyWidget() {
    if (this.widgetElement && this.widgetElement.parentNode) {
      this.widgetElement.remove();
    }
    this.widgetElement = null;
    if (this.emojiWidget) {
      this.emojiWidget.close();
      this.emojiWidget = null;
    }
    this.retryManager.cancel();
  }

  logDebug(stage, detail = {}) {
    eventBus.emit("debug:widget", { stage, detail });
  }
}
