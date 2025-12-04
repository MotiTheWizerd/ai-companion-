/**
 * Loader script - Content Script context
 * 1. Injects main module as script tag into page context
 * 2. Bridges messages between page context and background service worker
 * 3. Emits lifecycle events for DOM readiness and SPA navigation
 */

console.log("[Loader] Content script starting on:", window.location.href);
console.log("[Loader] VERSION CHECK: 2025-11-30 T 08:10");

const LOADER_SOURCE = "chatgpt-extension-loader";
const LIFECYCLE_EVENTS = {
  DOM_READY: "SEMANTIX:DOM_READY",
  NAVIGATION: "SEMANTIX:NAVIGATION",
  HOST_MUTATION: "SEMANTIX:HOST_MUTATION",
};

function postLifecycleEvent(type, detail = {}) {
  window.postMessage(
    {
      source: LOADER_SOURCE,
      type,
      detail: {
        url: window.location.href,
        timestamp: Date.now(),
        ...detail,
      },
    },
    "*",
  );
}

let domReadyEmitted = false;

// Inject main application script into page context
(function () {
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("src/content/content.js");
  script.type = "module";
  (document.head || document.documentElement).appendChild(script);

  // Inject UI styles
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = chrome.runtime.getURL("src/modules/UIControls/styles.css");
  (document.head || document.documentElement).appendChild(link);
})();

initLifecycleSignals();

function initLifecycleSignals() {
  setupNavigationObserver();
  ensureDomReadySignal();
}

function ensureDomReadySignal() {
  if (ensureBodyReady()) {
    return;
  }

  let bodyObserver = null;
  const tryEmit = () => {
    if (ensureBodyReady()) {
      window.removeEventListener("DOMContentLoaded", tryEmit);
      if (bodyObserver) {
        bodyObserver.disconnect();
      }
    }
  };

  window.addEventListener("DOMContentLoaded", tryEmit);
  bodyObserver = new MutationObserver(() => {
    tryEmit();
  });
  bodyObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

function ensureBodyReady() {
  if (domReadyEmitted) {
    return true;
  }
  if (!document.body || document.readyState === "loading") {
    return false;
  }
  domReadyEmitted = true;
  postLifecycleEvent(LIFECYCLE_EVENTS.DOM_READY);
  setupHostMutationObserver();
  return true;
}

function setupNavigationObserver() {
  let lastUrl = window.location.href;
  const notify = (trigger) => {
    const current = window.location.href;
    if (current === lastUrl) return;
    lastUrl = current;
    postLifecycleEvent(LIFECYCLE_EVENTS.NAVIGATION, { trigger });
  };

  window.addEventListener("popstate", () => notify("popstate"));
  window.addEventListener("hashchange", () => notify("hashchange"));
  setInterval(() => notify("poll"), 500);
}

function setupHostMutationObserver() {
  if (!document.body) return;

  let hostMutationPending = false;
  const criticalSelectors = ["#__next", "#__next-container", "main"];

  const isCriticalNode = (node) => {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
    if (node === document.body) return true;
    return criticalSelectors.some((selector) => {
      try {
        return node.matches(selector);
      } catch {
        return false;
      }
    });
  };

  const queueHostMutation = (reason, target) => {
    if (hostMutationPending) return;
    hostMutationPending = true;
    setTimeout(() => {
      hostMutationPending = false;
      postLifecycleEvent(LIFECYCLE_EVENTS.HOST_MUTATION, { reason, target });
    }, 150);
  };

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") {
        continue;
      }
      if (mutation.target === document.body) {
        if (mutation.addedNodes.length || mutation.removedNodes.length) {
          queueHostMutation("body-child-change");
          return;
        }
      }
      const changedNodes = [
        ...mutation.addedNodes,
        ...mutation.removedNodes,
      ].filter((node) => node.nodeType === Node.ELEMENT_NODE);
      if (
        isCriticalNode(mutation.target) ||
        changedNodes.some((node) => isCriticalNode(node))
      ) {
        queueHostMutation("critical-node-change", mutation.target.nodeName);
        return;
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

async function relayProjectInfo(messageType = "PROJECT_INFO_UPDATE") {
  try {
    const result = await chrome.storage.local.get([
      "selectedProjectId",
      "selectedProjectName",
      "user_settings",
    ]);
    window.postMessage(
      {
        source: "chatgpt-extension-response",
        type: messageType,
        success: true,
        data: {
          selectedProjectId: result.selectedProjectId || null,
          selectedProjectName: result.selectedProjectName || null,
          projects: result.user_settings?.projects || [],
        },
      },
      "*",
    );
  } catch (error) {
    console.warn("[Loader] Failed to relay project info:", error);
    window.postMessage(
      {
        source: "chatgpt-extension-response",
        type: messageType,
        success: false,
        error: error?.message || "Unable to read project info",
      },
      "*",
    );
  }
}

/**
 * Relay memory fetch setting to page context
 */
async function relayMemorySettings(messageType = "MEMORY_SETTINGS_UPDATE") {
  try {
    const result = await chrome.storage.local.get(["memoryFetchEnabled"]);
    // Default to true if not set
    const memoryFetchEnabled = result.memoryFetchEnabled !== false;

    window.postMessage(
      {
        source: "chatgpt-extension-response",
        type: messageType,
        success: true,
        data: {
          memoryFetchEnabled,
        },
      },
      "*",
    );
    console.log("[Loader] Relayed memory settings:", { memoryFetchEnabled });
  } catch (error) {
    console.warn("[Loader] Failed to relay memory settings:", error);
    window.postMessage(
      {
        source: "chatgpt-extension-response",
        type: messageType,
        success: false,
        error: error?.message || "Unable to read memory settings",
      },
      "*",
    );
  }
}

if (chrome?.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;
    if (
      changes.selectedProjectId ||
      changes.selectedProjectName ||
      changes.user_settings
    ) {
      relayProjectInfo("PROJECT_INFO_UPDATE");
    }
    if (changes.memoryFetchEnabled) {
      relayMemorySettings("MEMORY_SETTINGS_UPDATE");
    }
  });
}

/**
 * Handle saving project selection to chrome.storage
 */
async function handleSaveProjectSelection(data, requestId) {
  try {
    const payload = {
      selectedProjectId: data?.selectedProjectId || null,
      selectedProjectName: data?.selectedProjectName || null,
    };

    await chrome.storage.local.set(payload);
    console.log("[Loader] Saved project selection:", payload);

    window.postMessage(
      {
        source: "chatgpt-extension-response",
        type: "SAVE_PROJECT_SELECTION",
        requestId,
        success: true,
        data: payload,
      },
      "*",
    );
  } catch (error) {
    console.error("[Loader] Failed to save project selection:", error);
    window.postMessage(
      {
        source: "chatgpt-extension-response",
        type: "SAVE_PROJECT_SELECTION",
        requestId,
        success: false,
        error: error?.message || "Failed to save project selection",
      },
      "*",
    );
  }
}

/**
 * Message Bridge: Page Context ↔ Content Script ↔ Background
 *
 * Page context uses window.postMessage (doesn't have chrome.runtime access)
 * Content script forwards to background via chrome.runtime.sendMessage
 */

// Listen for messages from page context
window.addEventListener("message", async (event) => {
  // Only accept messages from same origin
  if (event.source !== window) return;

  // Filter messages from our extension
  if (!event.data || event.data.source !== "chatgpt-extension") return;

  console.log("[Loader] Received message from page:", event.data.type);
  const requestId = event.data.requestId;

  if (event.data.type === "REQUEST_PROJECT_INFO") {
    await relayProjectInfo("REQUEST_PROJECT_INFO");
    return;
  }

  if (event.data.type === "REQUEST_MEMORY_SETTINGS") {
    await relayMemorySettings("REQUEST_MEMORY_SETTINGS");
    return;
  }

  if (event.data.type === "SAVE_PROJECT_SELECTION") {
    await handleSaveProjectSelection(event.data.data, requestId);
    return;
  }

  // Deep clone to ensure we have a mutable object and no reference issues
  let requestPayload = JSON.parse(
    JSON.stringify({
      type: event.data.type,
      data: event.data.data,
      request: event.data.request,
    }),
  );

  // Inject Project ID for API requests if available in storage
  if (event.data.type === "API_REQUEST" && requestPayload.request?.data) {
    try {
      const storageData = await chrome.storage.local.get(null); // Get all data to debug
      console.log("[Loader] All storage keys:", Object.keys(storageData));

      if (storageData.selectedProjectId) {
        console.log(
          "[Loader] Injecting project ID from storage:",
          storageData.selectedProjectId,
        );
        requestPayload.request.data.project_id = storageData.selectedProjectId;
      }
    } catch (err) {
      console.warn("[Loader] Failed to read project ID from storage:", err);
    }

    // Validate Project ID and User ID
    const projectId = requestPayload.request.data.project_id;
    const userId = requestPayload.request.data.user_id;

    if (!projectId || !userId) {
      const missingField = !projectId ? "Project ID" : "User ID";
      console.error(`[Loader] Missing ${missingField}. Aborting request.`);
      alert(
        `Semantix Bridge: Please select a Project in the extension popup to continue.`,
      );

      // Send failure back to page context
      window.postMessage(
        {
          source: "chatgpt-extension-response",
          type: event.data.type,
          requestId,
          success: false,
          error: `Missing ${missingField}`,
        },
        "*",
      );
      return;
    }
  }

  // Forward to background service worker
  chrome.runtime.sendMessage(requestPayload, (response) => {
    if (chrome.runtime.lastError) {
      console.error(
        "[Loader] Background error:",
        chrome.runtime.lastError.message,
      );

      // Send error back to page context
      window.postMessage(
        {
          source: "chatgpt-extension-response",
          type: event.data.type,
          requestId,
          success: false,
          error: chrome.runtime.lastError.message,
        },
        "*",
      );
      return;
    }

    console.log("[Loader] Background response:", response);

    // Send response back to page context
    window.postMessage(
      {
        source: "chatgpt-extension-response",
        type: event.data.type,
        requestId,
        success: response?.success || false,
        data: response?.data,
        error: response?.error,
      },
      "*",
    );
  });
});

console.log("[Loader] Message bridge initialized");
