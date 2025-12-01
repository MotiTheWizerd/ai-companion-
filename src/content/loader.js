/**
 * Loader script - Content Script context
 * 1. Injects main module as script tag into page context
 * 2. Bridges messages between page context and background service worker
 */

console.log('[Loader] Content script starting on:', window.location.href);
console.log('[Loader] VERSION CHECK: 2025-11-30 T 08:10');

// Inject main application script into page context
(function () {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('src/content/content.js');
  script.type = 'module';
  (document.head || document.documentElement).appendChild(script);

  // Inject UI styles
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = chrome.runtime.getURL('src/modules/UIControls/styles.css');
  (document.head || document.documentElement).appendChild(link);
})();

/**
 * Message Bridge: Page Context ↔ Content Script ↔ Background
 *
 * Page context uses window.postMessage (doesn't have chrome.runtime access)
 * Content script forwards to background via chrome.runtime.sendMessage
 */

// Listen for messages from page context
window.addEventListener('message', async (event) => {
  // Only accept messages from same origin
  if (event.source !== window) return;

  // Filter messages from our extension
  if (!event.data || event.data.source !== 'chatgpt-extension') return;

  console.log('[Loader] Received message from page:', event.data.type);

  // Deep clone to ensure we have a mutable object and no reference issues
  let requestPayload = JSON.parse(JSON.stringify({
    type: event.data.type,
    data: event.data.data,
    request: event.data.request
  }));

  // Inject Project ID for API requests if available in storage
  if (event.data.type === 'API_REQUEST' && requestPayload.request?.data) {
    try {
      const storageData = await chrome.storage.local.get(null); // Get all data to debug
      console.log('[Loader] All storage keys:', Object.keys(storageData));

      if (storageData.selectedProjectId) {
        console.log('[Loader] Injecting project ID from storage:', storageData.selectedProjectId);
        requestPayload.request.data.project_id = storageData.selectedProjectId;
      }
    } catch (err) {
      console.warn('[Loader] Failed to read project ID from storage:', err);
    }

    // Validate Project ID and User ID
    const projectId = requestPayload.request.data.project_id;
    const userId = requestPayload.request.data.user_id;

    if (!projectId || !userId) {
      const missingField = !projectId ? 'Project ID' : 'User ID';
      console.error(`[Loader] Missing ${missingField}. Aborting request.`);
      alert(`Semantix Bridge: Please select a Project in the extension popup to continue.`);

      // Send failure back to page context
      window.postMessage({
        source: 'chatgpt-extension-response',
        type: event.data.type,
        success: false,
        error: `Missing ${missingField}`
      }, '*');
      return;
    }
  }

  // Forward to background service worker
  chrome.runtime.sendMessage(
    requestPayload,
    (response) => {
      if (chrome.runtime.lastError) {
        console.error('[Loader] Background error:', chrome.runtime.lastError.message);

        // Send error back to page context
        window.postMessage({
          source: 'chatgpt-extension-response',
          type: event.data.type,
          success: false,
          error: chrome.runtime.lastError.message
        }, '*');
        return;
      }

      console.log('[Loader] Background response:', response);

      // Send response back to page context
      window.postMessage({
        source: 'chatgpt-extension-response',
        type: event.data.type,
        success: response?.success || false,
        data: response?.data,
        error: response?.error
      }, '*');
    }
  );
});

console.log('[Loader] Message bridge initialized');
