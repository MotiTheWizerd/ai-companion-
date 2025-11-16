/**
 * Loader script - Content Script context
 * 1. Injects main module as script tag into page context
 * 2. Bridges messages between page context and background service worker
 */

// Inject main application script into page context
(function() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('src/content/content.js');
  script.type = 'module';
  (document.head || document.documentElement).appendChild(script);
})();

/**
 * Message Bridge: Page Context ↔ Content Script ↔ Background
 *
 * Page context uses window.postMessage (doesn't have chrome.runtime access)
 * Content script forwards to background via chrome.runtime.sendMessage
 */

// Listen for messages from page context
window.addEventListener('message', (event) => {
  // Only accept messages from same origin
  if (event.source !== window) return;

  // Filter messages from our extension
  if (!event.data || event.data.source !== 'chatgpt-extension') return;

  console.log('[Loader] Received message from page:', event.data.type);

  // Forward to background service worker
  chrome.runtime.sendMessage(
    {
      type: event.data.type,
      data: event.data.data,
      request: event.data.request
    },
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
