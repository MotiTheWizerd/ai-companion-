import { SemantixWidgets } from "../SemantixUIComponents/index.js";
import { eventBus } from "../../content/core/eventBus.js";
import { EmojiWidget } from "../widgets/emoji-widget/EmojiWidget.js";

/**
 * Injects Semantix widgets near the provider composer
 */
export class WidgetController {
  constructor(conversationManager) {
    this.conversationManager = conversationManager;
    this.observer = null;
    this.isInitialized = false;
    this.widgetElement = null;
    this.retryTimeout = null;
    this.retryDelay = 500;
    this.retryActiveDuration = 180000;
    this.retryCycleLength = 300000;
    this.retryWindowStart = null;
    this.retryCycleTimeout = null;
    this.currentUrl = typeof window !== "undefined" ? window.location.href : "";
    this.navigationCheckInterval = null;
    this.emojiWidget = null;
  }

  init() {
    if (this.isInitialized) return;
    if (!this.conversationManager) {
      console.warn("[WidgetController] Missing conversation manager");
      return;
    }
    this.startObserver();
    this.isInitialized = true;
  }

  startObserver() {
    if (!document.body) {
      window.addEventListener("DOMContentLoaded", () => this.startObserver());
      return;
    }

    this.setupNavigationWatcher();
    this.observer = new MutationObserver(() => this.attemptInjection());
    this.observer.observe(document.body, { childList: true, subtree: true });
    this.attemptInjection();
  }

  attemptInjection() {
    if (this.widgetElement) {
      if (document.body.contains(this.widgetElement)) {
        this.clearRetrySchedule();
        return;
      }
      this.widgetElement = null;
    }

    const selectors = this.conversationManager.getSelectors();
    if (!selectors || !selectors.getWidgetContainer) {
      this.scheduleRetry();
      return;
    }

    const widgetSelector = selectors.getWidgetContainer();
    if (!widgetSelector) {
      this.scheduleRetry();
      return;
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
        console.log(
          "[WidgetController] Found widget target via selector:",
          selector,
        );
        break;
      }
    }

    const existing = document.querySelector(".semantix-widgets");

    if (existing) {
      this.widgetElement = existing;
      this.clearRetrySchedule();
      this.bindActions();
      return;
    }

    if (!targetElement) {
      this.scheduleRetry();
      return;
    }
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
    this.retryWindowStart = null;

    const widgetPosition = selectors.getWidgetPosition
      ? selectors.getWidgetPosition()
      : "append";
    this.injectWidget(targetElement, widgetPosition);
  }

  injectWidget(targetElement, position = "append") {
    const container = document.createElement("div");
    container.innerHTML = SemantixWidgets().trim();
    const widget = container.firstElementChild;

    if (!widget) {
      console.warn("[WidgetController] Failed to build widget template");
      return;
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
    this.clearRetrySchedule();
    this.bindActions();
    console.log("[WidgetController] Widgets injected");
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

  scheduleRetry() {
    if (this.retryWindowStart === null) {
      this.retryWindowStart = Date.now();
    }

    const now = Date.now();
    const elapsed = now - this.retryWindowStart;

    if (elapsed >= this.retryCycleLength) {
      this.retryWindowStart = now;
      return this.scheduleRetry();
    }

    if (elapsed >= this.retryActiveDuration) {
      if (this.retryCycleTimeout || this.retryTimeout) {
        return;
      }
      const cycleElapsed = Date.now() - this.retryWindowStart;
      const waitTime = Math.max(0, this.retryCycleLength - cycleElapsed);
      console.info(
        `[WidgetController] Retry window exhausted, pausing for ${waitTime}ms`,
      );
      this.retryCycleTimeout = setTimeout(() => {
        this.retryCycleTimeout = null;
        this.retryWindowStart = null;
        this.scheduleRetry();
      }, waitTime || 1);
      return;
    }

    if (this.retryTimeout) {
      return;
    }

    this.retryTimeout = setTimeout(() => {
      this.retryTimeout = null;
      this.attemptInjection();
    }, this.retryDelay);
  }

  clearRetrySchedule() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
    if (this.retryCycleTimeout) {
      clearTimeout(this.retryCycleTimeout);
      this.retryCycleTimeout = null;
    }
    this.retryWindowStart = null;
  }

  setupNavigationWatcher() {
    if (this.navigationCheckInterval) {
      return;
    }

    this.currentUrl = window.location.href;
    this.navigationCheckInterval = setInterval(() => {
      const latestUrl = window.location.href;
      if (latestUrl === this.currentUrl) {
        return;
      }
      this.handleNavigationChange(latestUrl);
    }, 500);
  }

  handleNavigationChange(newUrl) {
    console.log("[WidgetController] Navigation detected, resetting widgets");
    this.currentUrl = newUrl;

    if (this.widgetElement && this.widgetElement.parentNode) {
      this.widgetElement.remove();
    }
    this.widgetElement = null;
    this.clearRetrySchedule();
    this.retryWindowStart = null;
    this.attemptInjection();
  }
}
