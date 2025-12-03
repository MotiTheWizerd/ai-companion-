import { eventBus } from "./eventBus.js";

const CHANNELS = [
  { event: "debug:lifecycle", label: "Lifecycle" },
  { event: "debug:toolbar", label: "ToolbarController" },
  { event: "debug:widget", label: "WidgetController" },
];

/**
 * Centralized debug logger so messages share a consistent format.
 */
export class DebugConsole {
  constructor() {
    this.handlers = CHANNELS.map(({ event, label }) => {
      const handler = (payload = {}) => {
        const stage = payload.stage || "event";
        const info = payload.message ? ` ${payload.message}` : "";
        const details = payload.detail || payload.details || payload;
        const prefix = `[${label}] - ${stage}`;
        if (details && Object.keys(details).length > 0) {
          console.log(prefix + info, details);
        } else {
          console.log(prefix + info);
        }
      };
      eventBus.on(event, handler);
      return { event, handler };
    });
  }
}
