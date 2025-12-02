import { SemantixWidgets } from "../SemantixUIComponents/index.js";
import { eventBus } from "../../content/core/eventBus.js";

/**
 * Injects Semantix widgets near the provider composer
 */
export class WidgetController {
  constructor(conversationManager) {
    this.conversationManager = conversationManager;
    this.observer = null;
    this.isInitialized = false;
    this.widgetElement = null;
    this.retryCount = 0;
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

    this.observer = new MutationObserver(() => this.attemptInjection());
    this.observer.observe(document.body, { childList: true, subtree: true });
    this.attemptInjection();
  }

  attemptInjection() {
    if (this.widgetElement) {
      if (document.body.contains(this.widgetElement)) {
        return;
      }
      this.widgetElement = null;
    }

    const selectors = this.conversationManager.getSelectors();
    if (!selectors || !selectors.getWidgetContainer) {
      return;
    }

    const widgetSelector = selectors.getWidgetContainer();
    if (!widgetSelector) {
      return;
    }

    const targetElement = document.querySelector(widgetSelector);
    const existing = document.querySelector(".semantix-widgets");

    if (existing) {
      this.widgetElement = existing;
      this.bindActions();
      return;
    }

    if (!targetElement) {
      if (this.retryCount < 10) {
        this.retryCount += 1;
        setTimeout(() => this.attemptInjection(), 400);
      }
      return;
    }

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
    this.bindActions();
    console.log("[WidgetController] Widgets injected");
  }

  bindActions() {
    if (!this.widgetElement) return;
    const importBtn = this.widgetElement.querySelector(
      '[data-widget-action="import"]',
    );

    if (importBtn) {
      importBtn.addEventListener("click", (event) => {
        event.preventDefault();
        eventBus.emit("import:chat", { source: "widgets-panel" });
      });
    }
  }
}
