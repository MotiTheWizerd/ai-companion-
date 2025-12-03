import { eventBus } from "./eventBus.js";

const SOURCE = "chatgpt-extension-loader";
const EVENT_MAP = {
  "SEMANTIX:DOM_READY": "lifecycle:dom-ready",
  "SEMANTIX:NAVIGATION": "lifecycle:navigation",
  "SEMANTIX:HOST_MUTATION": "lifecycle:host-mutation",
};

/**
 * Bridges loader lifecycle events into the shared event bus.
 */
export class LifecycleBridge {
  constructor() {
    this.handleMessage = this.handleMessage.bind(this);
    window.addEventListener("message", this.handleMessage);
    this.emitFallbackDomReady();
  }

  handleMessage(event) {
    if (event.source !== window) return;
    const payload = event.data || {};
    if (payload.source !== SOURCE) return;

    const busEvent = EVENT_MAP[payload.type];
    if (!busEvent) return;

    eventBus.emit("debug:lifecycle", {
      stage: payload.type,
      detail: payload.detail || {},
    });
    eventBus.emit(busEvent, payload.detail || {});
  }

  emitFallbackDomReady() {
    if (document.readyState === "loading" || !document.body) {
      window.addEventListener(
        "DOMContentLoaded",
        () => {
          eventBus.emit("lifecycle:dom-ready", {
            url: window.location.href,
            source: "fallback",
          });
        },
        { once: true },
      );
      return;
    }

    eventBus.emit("lifecycle:dom-ready", {
      url: window.location.href,
      source: "immediate",
    });
  }
}
