const BUTTON_SELECTOR = 'button[data-testid="model-switcher-dropdown-button"]';
const VALUE_CONTAINER_SELECTOR = ':scope > div:first-of-type';

/**
 * Locks the ChatGPT model switcher button to a specific model label
 * and re-injects the template whenever the DOM mutates.
 */
export class ModelSwitcher {
  constructor(options = {}) {
    this.documentRef = options.document || document;
    this.providerLabel = options.providerLabel || "ChatGPT";
    this.modelLabel = options.modelLabel || "4.1";
    this.buttonSelector = options.buttonSelector || BUTTON_SELECTOR;
    this.valueContainerSelector =
      options.valueContainerSelector || VALUE_CONTAINER_SELECTOR;
    this.buttonObserver = null;
    this.domObserver = null;
    this.buttonElement = null;
    this.prototypeContainer = null;
    this.logPrefix = options.logPrefix || "[ModelSwitcher]";
  }

  init() {
    this.log(
      `Initializing with selector ${this.buttonSelector} targeting "${this.providerLabel} ${this.modelLabel}"`,
    );
    this.findAndLockButton();
    this.observeDOM();
  }

  /**
   * Locate the button, lock it, and start observing for button changes.
   */
  findAndLockButton() {
    this.log("Searching for model button...");
    this.buttonElement =
      this.documentRef.querySelector(this.buttonSelector) || null;

    if (!this.buttonElement) {
      this.log("Model button not found yet.");
      return;
    }

    this.log("Model button located, injecting template.");
    this.injectTemplate();
    this.observeButton();
  }

  /**
   * Observe the overall DOM so if ChatGPT re-renders the button,
   * we can re-acquire it.
   */
  observeDOM() {
    if (this.domObserver) return;

    this.domObserver = new MutationObserver(() => {
      if (this.buttonElement && this.documentRef.contains(this.buttonElement)) {
        return;
      }
      this.log("Button removed/re-rendered, reacquiring...");
      if (!this.buttonElement || !this.documentRef.contains(this.buttonElement)) {
        this.disconnectButtonObserver();
        this.findAndLockButton();
      }
    });

    this.domObserver.observe(this.documentRef.body, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * Observe the button for changes to keep the locked template intact.
   */
  observeButton() {
    if (!this.buttonElement || this.buttonObserver) return;

    this.log("Attaching mutation observer to locked button.");
    this.buttonObserver = new MutationObserver(() => {
      if (!this.buttonElement) return;
      const currentModel = this.readCurrentModelLabel();
      if (currentModel !== this.modelLabel) {
        this.log(
          `Detected model label change (${currentModel} -> ${this.modelLabel}), reinjecting.`,
        );
        this.injectTemplate();
      }
    });

    this.buttonObserver.observe(this.buttonElement, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ["aria-label"],
    });
  }

  /**
   * Replace the existing label template within the button.
   */
  injectTemplate() {
    if (!this.buttonElement) return;

    const valueContainer =
      this.buttonElement.querySelector(this.valueContainerSelector) ||
      this.buttonElement.firstElementChild;

    if (!valueContainer) {
      this.log("Value container not found inside button, skipping.");
      return;
    }

    if (!this.prototypeContainer) {
      this.prototypeContainer = valueContainer.cloneNode(false);
    }

    const newContainer = this.prototypeContainer.cloneNode(false);
    newContainer.innerHTML = "";
    newContainer.append(
      this.documentRef.createTextNode(this.providerLabel),
      this.createModelSpan(),
    );

    valueContainer.replaceWith(newContainer);
    this.buttonElement.setAttribute(
      "aria-label",
      `Model selector, current model is ${this.modelLabel}`,
    );
    this.log("Injected locked template into button.");
  }

  /**
   * Create the span that shows the locked model label.
   */
  createModelSpan() {
    const span = this.documentRef.createElement("span");
    span.className = "text-token-text-tertiary";
    span.textContent = this.modelLabel;
    return span;
  }

  /**
   * Read the model label currently displayed in the button.
   */
  readCurrentModelLabel() {
    if (!this.buttonElement) return null;
    const container = this.buttonElement.querySelector(
      this.valueContainerSelector,
    );
    const span = container?.querySelector('span.text-token-text-tertiary');
    return span?.textContent?.trim() || null;
  }

  disconnectButtonObserver() {
    if (this.buttonObserver) {
      this.buttonObserver.disconnect();
      this.buttonObserver = null;
    }
    this.buttonElement = null;
  }

  destroy() {
    if (this.domObserver) {
      this.domObserver.disconnect();
      this.domObserver = null;
    }
    this.disconnectButtonObserver();
  }

  log(message, ...args) {
    try {
      console.log(`${this.logPrefix} ${message}`, ...args);
    } catch (error) {
      // Swallow logging errors to avoid breaking execution
    }
  }
}
