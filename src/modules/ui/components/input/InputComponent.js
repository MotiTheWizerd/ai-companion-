/**
 * InputComponent
 * Reusable helper for interacting with provider input elements (contenteditable or textarea)
 */
export class InputComponent {
  constructor(options = {}) {
    this.documentRef = options.document || document;
    this.selector = options.selector || "#prompt-textarea";
    this.sendButtonSelector =
      options.sendButtonSelector || 'button[data-testid="send-button"]';
    this.onSendFallback = options.onSend || null;
  }

  /**
   * Get underlying DOM node (returns null if missing)
   */
  getElement() {
    return this.documentRef.querySelector(this.selector);
  }

  /**
   * Ensure element exists or throw descriptive error
   */
  ensureElement() {
    const el = this.getElement();
    if (!el) {
      throw new Error(
        `[InputComponent] Element not found for selector "${this.selector}"`,
      );
    }
    return el;
  }

  /**
   * Focus the input
   */
  focus() {
    const el = this.ensureElement();
    el.focus();
  }

  /**
   * Clear any existing content
   */
  clear() {
    this.setText("");
  }

  /**
   * Replace the entire input with text
   * @param {string} text
   */
  setText(text) {
    const el = this.ensureElement();
    if (this.isContentEditable(el)) {
      this.writeToContentEditable(el, text);
    } else if ("value" in el) {
      el.value = text;
    }
    this.dispatchInputEvent(el);
    return el;
  }

  /**
   * Append text to the current input value
   * @param {string} text
   */
  addText(text) {
    const el = this.ensureElement();
    const existing = this.getText();
    const nextValue = `${existing}${text}`;
    return this.setText(nextValue);
  }

  /**
   * Retrieve current text value
   */
  getText() {
    const el = this.ensureElement();
    if (this.isContentEditable(el)) {
      return el.textContent || "";
    }
    if ("value" in el) {
      return el.value || "";
    }
    return "";
  }

  /**
   * Click send button or run fallback handler
   */
  sendMessage() {
    const button = this.documentRef.querySelector(this.sendButtonSelector);
    if (button) {
      button.click();
      return true;
    }
    if (typeof this.onSendFallback === "function") {
      this.onSendFallback();
      return true;
    }
    console.warn(
      `[InputComponent] send button not found for selector "${this.sendButtonSelector}"`,
    );
    return false;
  }

  /**
   * Detect whether element is a contenteditable node
   */
  isContentEditable(el) {
    return Boolean(el instanceof this.documentRef.defaultView.HTMLElement && el.isContentEditable);
  }

  /**
   * Write text to a ProseMirror-style contenteditable element
   */
  writeToContentEditable(el, text) {
    el.innerHTML = "";
    const paragraph = this.documentRef.createElement("p");
    paragraph.setAttribute("data-placeholder", el.getAttribute("data-placeholder") || "");

    if (text && text.length) {
      const textNode = this.documentRef.createTextNode(text);
      paragraph.appendChild(textNode);
    }

    const trailingBreak = this.documentRef.createElement("br");
    trailingBreak.className = "ProseMirror-trailingBreak";
    paragraph.appendChild(trailingBreak);

    el.appendChild(paragraph);
  }

  /**
   * Dispatch input/change events so frameworks react to programmatic updates
   */
  dispatchInputEvent(el) {
    const InputEventCtor =
      this.documentRef.defaultView.InputEvent || this.documentRef.defaultView.Event;
    const inputEvent = new InputEventCtor("input", {
      bubbles: true,
      cancelable: true,
      data: this.getText(),
    });
    el.dispatchEvent(inputEvent);

    const changeEvent = new Event("change", { bubbles: true });
    el.dispatchEvent(changeEvent);
  }

  /**
   * Convenience factory for ChatGPT default selectors
   */
  static forChatGPT(options = {}) {
    return new InputComponent({
      selector: "#prompt-textarea",
      sendButtonSelector: 'button[data-testid="send-button"]',
      ...options,
    });
  }
}
