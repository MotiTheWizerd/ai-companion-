# Extension Contexts

## Overview

The extension operates across three distinct JavaScript execution contexts, each with different capabilities and restrictions. This multi-context architecture is necessary to bypass Content Security Policy (CSP) restrictions while maintaining full DOM access.

## The Three Contexts

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Provider Website                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Page Context (Injected Script)                        │  │
│  │ File: content.js                                      │  │
│  │                                                        │  │
│  │ ✓ Full DOM access                                     │  │
│  │ ✓ Can modify window.fetch                             │  │
│  │ ✓ Access to page variables                            │  │
│  │ ✗ CSP blocks HTTP requests                            │  │
│  │ ✗ No chrome.* APIs                                    │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │ window.postMessage                    │
│  ┌──────────────────▼───────────────────────────────────┐  │
│  │ Content Script (Isolated World)                       │  │
│  │ File: loader.js                                       │  │
│  │                                                        │  │
│  │ ✓ chrome.runtime API access                           │  │
│  │ ✓ Limited DOM access (read-only)                      │  │
│  │ ✗ Cannot intercept fetch                              │  │
│  │ ✗ CSP blocks HTTP requests                            │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │ chrome.runtime.sendMessage            │
└─────────────────────┼───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│ Background Context (Service Worker)                         │
│ File: background.js                                         │
│                                                              │
│ ✓ No CSP restrictions                                       │
│ ✓ Can make HTTP requests                                    │
│ ✓ Persistent API client                                     │
│ ✗ No DOM access                                             │
│ ✗ No window object                                          │
└──────────────────────────────────────────────────────────────┘
```

## 1. Page Context

### File Location
[content.js](../src/content/content.js)

### Injection Method
The content script ([loader.js](../src/content/loader.js)) injects this script into the page context:

```javascript
const script = document.createElement('script');
script.src = chrome.runtime.getURL('src/content/content.js');
script.type = 'module';
(document.head || document.documentElement).appendChild(script);
```

### Capabilities

**What it CAN do**:
- Access and modify the page's DOM
- Intercept native browser APIs (e.g., `window.fetch`, `XMLHttpRequest`)
- Access page-level JavaScript variables and objects
- Execute in the same context as the website's scripts
- Read and modify localStorage

**What it CANNOT do**:
- Make HTTP requests to external domains (blocked by CSP)
- Access `chrome.*` APIs
- Directly communicate with background script
- Access extension resources without web_accessible_resources

### Responsibilities

1. **Application Orchestration**: Initialize and coordinate all modules
2. **Network Interception**: Replace `window.fetch` to intercept API calls
3. **Provider Management**: Detect and use the appropriate provider
4. **State Management**: Track conversations and messages
5. **Event Handling**: Process stream events and update state
6. **Storage**: Save conversations to localStorage

### Key Components

```javascript
// Main orchestrator
Application
├── ProviderRegistry (detect ChatGPT/Claude/Qwen)
├── NetworkInterceptor (intercept fetch calls)
├── ConversationManager (track conversation state)
├── MessageManager (accumulate streaming messages)
├── StorageManager (persist to localStorage)
├── APIClient (coordinate backend sync)
└── UIController (enhance UI)
```

### Communication

**Sending to Content Script**:
```javascript
window.postMessage({
  source: 'chatgpt-extension',
  type: 'SYNC_CONVERSATION' | 'API_REQUEST',
  data: { /* request data */ }
}, '*');
```

**Receiving from Content Script**:
```javascript
window.addEventListener('message', (event) => {
  if (event.data.source === 'chatgpt-extension-response') {
    const { success, data, error } = event.data;
    // Handle response
  }
});
```

## 2. Content Script Context

### File Location
[loader.js](../src/content/loader.js)

### Injection Method
Configured in [manifest.json](../public/manifest.json):

```json
{
  "content_scripts": [{
    "matches": [
      "https://chatgpt.com/*",
      "https://claude.ai/*",
      "https://chat.qwen.ai/*"
    ],
    "js": ["src/content/loader.js"],
    "run_at": "document_start"
  }]
}
```

### Capabilities

**What it CAN do**:
- Access `chrome.*` APIs (runtime, storage, etc.)
- Read the page DOM (but in an isolated context)
- Communicate with background script via `chrome.runtime`
- Receive messages from page context via `window.postMessage`

**What it CANNOT do**:
- Intercept native browser APIs (runs in isolated world)
- Make HTTP requests (still subject to CSP)
- Access page JavaScript variables
- Modify page context functions

### Responsibilities

1. **Script Injection**: Inject main application script into page context
2. **Message Bridge**: Relay messages between page and background contexts
3. **Style Injection**: Inject UI styles into page
4. **Request Forwarding**: Forward API requests from page to background

### Message Bridge Implementation

**Page → Background**:
```javascript
// Listen for messages from page context
window.addEventListener('message', async (event) => {
  if (event.source !== window) return;
  if (event.data.source !== 'chatgpt-extension') return;

  try {
    // Forward to background script
    const response = await chrome.runtime.sendMessage({
      type: event.data.type,
      data: event.data.data
    });

    // Send response back to page
    window.postMessage({
      source: 'chatgpt-extension-response',
      type: event.data.type,
      success: true,
      data: response.data
    }, '*');
  } catch (error) {
    // Send error back to page
    window.postMessage({
      source: 'chatgpt-extension-response',
      type: event.data.type,
      success: false,
      error: error.message
    }, '*');
  }
});
```

**Background → Page**:
```javascript
// Background sends response → loader receives → page gets response
// (Response flow is handled in the try/catch above)
```

### Style Injection

```javascript
const linkElement = document.createElement('link');
linkElement.rel = 'stylesheet';
linkElement.href = chrome.runtime.getURL('src/modules/UIControls/styles.css');
document.head.appendChild(linkElement);
```

## 3. Background Context

### File Location
[background.js](../src/background/background.js)

### Execution Environment
Manifest V3 service worker (non-persistent)

```json
{
  "background": {
    "service_worker": "src/background/background.js"
  }
}
```

### Capabilities

**What it CAN do**:
- Make HTTP requests to any domain (no CSP restrictions)
- Access chrome.* APIs (storage, tabs, runtime, etc.)
- Persist data across tab closures (IndexedDB, chrome.storage)
- Handle extension lifecycle events
- Execute fetch with AbortController for timeouts

**What it CANNOT do**:
- Access DOM or window object
- Access page JavaScript variables
- Directly interact with page content

### Responsibilities

1. **API Client**: Execute HTTP requests to backend API
2. **Message Handler**: Process requests from content scripts
3. **Request Validation**: Sanitize and validate incoming data
4. **Error Handling**: Catch and report API failures

### API Client Implementation

```javascript
import { APIClient } from '../modules/APIClient/index.js';

// Initialize with config
const apiClient = new APIClient({
  baseUrl: 'http://localhost:8000',
  timeout: 30000,
  retryAttempts: 3
});

await apiClient.init();
```

### Message Handlers

**Sync Conversation**:
```javascript
async function handleSyncConversation(conversationData) {
  try {
    // Fix any JSON issues in conversation data
    const fixedData = fixAndValidateJSON(conversationData);

    // Prepare request with user_id
    const requestData = {
      ...fixedData,
      user_id: API_CONFIG.USER_ID
    };

    // Enqueue request via API client
    const requestId = apiClient.enqueueRequest({
      method: 'POST',
      endpoint: '/conversations',
      data: requestData
    });

    // Wait for completion
    const result = await waitForRequestCompletion(requestId);

    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('[Background] Sync failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
```

**Fetch Memory**:
```javascript
async function handleFetchMemory(data) {
  try {
    const requestId = apiClient.enqueueRequest({
      method: 'POST',
      endpoint: '/conversations/fetch-memory',
      data: {
        query: data.query,
        user_id: data.user_id,
        project_id: data.project_id,
        limit: data.limit || 5,
        min_similarity: data.min_similarity || 0.5
      }
    });

    const result = await waitForRequestCompletion(requestId);

    return {
      success: true,
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
```

**Generic API Request**:
```javascript
async function handleAPIRequest(requestData) {
  const requestId = apiClient.enqueueRequest(requestData);
  const result = await waitForRequestCompletion(requestId);
  return result;
}
```

### Request Completion Polling

```javascript
function waitForRequestCompletion(requestId, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const checkInterval = 100;

    const checkStatus = () => {
      const request = apiClient.getRequestState(requestId);

      if (request.status === 'completed') {
        resolve(request.result);
      } else if (request.status === 'failed') {
        reject(new Error(request.error));
      } else if (Date.now() - startTime > timeout) {
        reject(new Error('Request timeout'));
      } else {
        setTimeout(checkStatus, checkInterval);
      }
    };

    checkStatus();
  });
}
```

### Chrome Runtime Listener

```javascript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { type, data } = message;

  switch (type) {
    case 'SYNC_CONVERSATION':
      handleSyncConversation(data)
        .then(response => sendResponse(response))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;  // Keep channel open for async response

    case 'FETCH_MEMORY':
      handleFetchMemory(data)
        .then(response => sendResponse(response))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'API_REQUEST':
      handleAPIRequest(data)
        .then(response => sendResponse({ success: true, data: response }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    default:
      sendResponse({ success: false, error: 'Unknown message type' });
      return false;
  }
});
```

## CSP Bypass Strategy

### The Problem

Modern websites implement Content Security Policy (CSP) to prevent malicious scripts from making unauthorized network requests. For example:

```
Content-Security-Policy: default-src 'self'; connect-src https://api.openai.com
```

This policy blocks scripts from making HTTP requests to `localhost:8000` (our backend).

### The Solution

```
Page Context (CSP Restricted)
    ↓ window.postMessage
Content Script (CSP Restricted, but has chrome.runtime)
    ↓ chrome.runtime.sendMessage
Background Script (No CSP)
    ↓ HTTP fetch
Backend API (localhost:8000)
```

### Why This Works

1. **Page Context**: Can intercept fetch and process streams, but cannot make API calls
2. **Content Script**: Can communicate with background, but still CSP-restricted
3. **Background Script**: Runs in extension context with no CSP, can make any HTTP request

### Request Flow Example

```javascript
// Page Context
const result = await new Promise((resolve, reject) => {
  const requestId = generateUniqueId();

  window.addEventListener('message', function handler(event) {
    if (event.data.requestId === requestId) {
      window.removeEventListener('message', handler);
      if (event.data.success) {
        resolve(event.data.data);
      } else {
        reject(new Error(event.data.error));
      }
    }
  });

  window.postMessage({
    source: 'chatgpt-extension',
    type: 'API_REQUEST',
    requestId,
    data: { method: 'POST', endpoint: '/conversations', data: {...} }
  }, '*');
});

// Content Script (automatically bridges to background)
// ... bridge code from above ...

// Background Script
// Executes fetch and returns response
```

## Context Detection

The extension detects its execution context:

```javascript
// Check if running in background context
const isBackground = typeof window === 'undefined';

// Check if running in content script
const isContentScript = typeof chrome !== 'undefined' && chrome.runtime;

// Check if running in page context
const isPageContext = typeof window !== 'undefined' && !isContentScript;
```

## Security Considerations

### 1. Message Validation

```javascript
// Always validate message source
if (event.source !== window) return;
if (event.data.source !== 'chatgpt-extension') return;
```

### 2. Origin Checking

```javascript
// Verify origin in production
if (event.origin !== window.location.origin) return;
```

### 3. Data Sanitization

```javascript
// Sanitize before sending to backend
function fixAndValidateJSON(data) {
  // Remove undefined, null, fix malformed JSON
  // Validate required fields
  // Return sanitized data
}
```

### 4. Request Authentication

```javascript
// Always include user_id from config (not from request)
const requestData = {
  ...data,
  user_id: API_CONFIG.USER_ID  // From userSettings.json
};
```

## Debugging Tips

### Viewing Context Logs

**Page Context**:
- Open DevTools on the page
- Console tab shows logs from content.js

**Content Script**:
- Click extension icon → "Inspect views: service worker"
- OR right-click extension → "Inspect popup"
- Console shows loader.js logs

**Background Script**:
- chrome://extensions → "Inspect views: service worker"
- Console shows background.js logs

### Context Identification in Logs

```javascript
// Page context
console.log('[Page Context]', message);

// Content script
console.log('[Content Script]', message);

// Background
console.log('[Background]', message);
```

## Related Documentation

- **Network Interception**: [08-network-interception.md](08-network-interception.md)
- **API Client**: [06-api-client.md](06-api-client.md)
- **Data Flow**: [04-data-flow.md](04-data-flow.md)
