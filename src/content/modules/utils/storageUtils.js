/**
 * Storage utility functions
 *
 * NOTE: These functions run in PAGE CONTEXT (injected script) where
 * chrome.storage is NOT available. All storage access must go through
 * the postMessage bridge to loader.js (content script context).
 */

/**
 * Get project ID from storage via postMessage bridge
 * @returns {Promise<string|null>} Project ID or null if not available
 */
export async function getProjectIdFromStorage() {
  return new Promise((resolve) => {
    const requestId = `project_info_${Date.now()}`;

    const responseHandler = (event) => {
      if (event.source !== window) return;
      if (!event.data || event.data.source !== "chatgpt-extension-response")
        return;
      if (event.data.type !== "REQUEST_PROJECT_INFO") return;

      window.removeEventListener("message", responseHandler);

      if (event.data.success && event.data.data) {
        resolve(event.data.data.selectedProjectId || null);
      } else {
        resolve(null);
      }
    };

    window.addEventListener("message", responseHandler);

    // Request project info from loader
    window.postMessage(
      {
        source: "chatgpt-extension",
        type: "REQUEST_PROJECT_INFO",
        requestId,
      },
      "*",
    );

    // Timeout after 2 seconds
    setTimeout(() => {
      window.removeEventListener("message", responseHandler);
      resolve(null);
    }, 2000);
  });
}

/**
 * Get project ID synchronously using a callback approach
 * Since chrome.storage is async, this returns null if not immediately available
 * @returns {Promise<string|null>} Project ID or null if not available
 */
export async function getProjectIdSync() {
  return getProjectIdFromStorage();
}

/**
 * Get user ID from storage via postMessage bridge
 * @returns {Promise<string|null>} User ID or null if not available
 */
export async function getUserIdFromStorage() {
  // User ID is typically from config, not storage
  // But if needed, this would use the same bridge pattern
  return new Promise((resolve) => {
    const requestId = `user_info_${Date.now()}`;

    const responseHandler = (event) => {
      if (event.source !== window) return;
      if (!event.data || event.data.source !== "chatgpt-extension-response")
        return;
      if (event.data.type !== "REQUEST_USER_INFO") return;

      window.removeEventListener("message", responseHandler);

      if (event.data.success && event.data.data) {
        resolve(event.data.data.userId || null);
      } else {
        resolve(null);
      }
    };

    window.addEventListener("message", responseHandler);

    window.postMessage(
      {
        source: "chatgpt-extension",
        type: "REQUEST_USER_INFO",
        requestId,
      },
      "*",
    );

    // Timeout after 2 seconds
    setTimeout(() => {
      window.removeEventListener("message", responseHandler);
      resolve(null);
    }, 2000);
  });
}

/**
 * Get memory fetch enabled setting from loader via postMessage
 * This is used in page context where chrome.storage is not available
 * @returns {Promise<boolean>} True if memory fetch is enabled (default: true)
 */
export async function getMemoryFetchEnabled() {
  return new Promise((resolve) => {
    const requestId = `memory_settings_${Date.now()}`;

    const responseHandler = (event) => {
      if (event.source !== window) return;
      if (!event.data || event.data.source !== "chatgpt-extension-response")
        return;
      if (event.data.type !== "REQUEST_MEMORY_SETTINGS") return;

      window.removeEventListener("message", responseHandler);

      if (event.data.success && event.data.data) {
        resolve(event.data.data.memoryFetchEnabled !== false);
      } else {
        // Default to true on error
        resolve(true);
      }
    };

    window.addEventListener("message", responseHandler);

    // Request memory settings from loader
    window.postMessage(
      {
        source: "chatgpt-extension",
        type: "REQUEST_MEMORY_SETTINGS",
        requestId,
      },
      "*",
    );

    // Timeout after 2 seconds, default to true
    setTimeout(() => {
      window.removeEventListener("message", responseHandler);
      resolve(true);
    }, 2000);
  });
}

/**
 * Save project selection via postMessage bridge
 * @param {string|null} projectId - Project ID to save
 * @param {string|null} projectName - Project name to save
 * @returns {Promise<boolean>} True if save was successful
 */
export async function saveProjectSelection(projectId, projectName) {
  return new Promise((resolve) => {
    const requestId = `save_project_${Date.now()}`;

    const responseHandler = (event) => {
      if (event.source !== window) return;
      if (!event.data || event.data.source !== "chatgpt-extension-response")
        return;
      if (event.data.type !== "SAVE_PROJECT_SELECTION") return;

      window.removeEventListener("message", responseHandler);
      resolve(event.data.success === true);
    };

    window.addEventListener("message", responseHandler);

    window.postMessage(
      {
        source: "chatgpt-extension",
        type: "SAVE_PROJECT_SELECTION",
        requestId,
        data: {
          selectedProjectId: projectId,
          selectedProjectName: projectName,
        },
      },
      "*",
    );

    // Timeout after 2 seconds
    setTimeout(() => {
      window.removeEventListener("message", responseHandler);
      resolve(false);
    }, 2000);
  });
}
