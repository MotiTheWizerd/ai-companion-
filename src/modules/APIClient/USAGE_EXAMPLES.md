# API Client Usage Examples

Quick start guide with real-world examples.

## Quick Start

### 1. Fire-and-Forget (Recommended for Most Cases)

```javascript
import { APIHelper } from './modules/APIClient/helpers.js';

// Send a conversation to backend
APIHelper.syncFull({
  conversationId: 'conv_abc123',
  title: 'ChatGPT Conversation',
  messages: [
    {
      messageId: 'msg_1',
      role: 'user',
      content: 'What is the meaning of life?',
      timestamp: '2025-11-16T10:00:00Z'
    },
    {
      messageId: 'msg_2',
      role: 'assistant',
      content: '42',
      timestamp: '2025-11-16T10:00:05Z'
    }
  ],
  metadata: {
    source: 'chatgpt',
    model: 'gpt-4'
  }
});

// That's it! The request is queued and handled automatically
// Events will be emitted for success/failure
```

### 2. Promise-Based (When You Need Response)

```javascript
import { APIPromise } from './modules/APIClient/helpers.js';

async function sendAndWait() {
  try {
    const response = await APIPromise.syncFull({
      conversationId: 'conv_abc123',
      messages: [/* ... */]
    });

    console.log('✅ Synced successfully!', response);
    return response;

  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    throw error;
  }
}
```

### 3. Browser Console (Public API)

```javascript
// In ChatGPT page console after extension loads

// Check API health
window.chatGPTMessages.api.healthCheck();

// Sync current conversation
window.chatGPTMessages.api.syncConversation();

// Track custom event
window.chatGPTMessages.api.trackEvent('custom_action', {
  action: 'button_click',
  value: 42
});
```

## Real-World Scenarios

### Scenario 1: Auto-Sync After Conversation

```javascript
// In streamHandlers.js - handleStreamComplete

export function handleStreamComplete(data, managers) {
  const { conversationId, messageId } = data;
  const { conversationManager, apiClient } = managers;

  // Mark message as complete
  conversationManager.completeMessage(messageId);

  // Get full conversation
  const conversation = conversationManager.getConversation();

  // Auto-sync to backend (if enabled)
  if (apiClient.config.autoSync) {
    APIHelper.syncFull(conversation);
  }
}
```

### Scenario 2: Manual Sync Button

```javascript
// In your popup.js or UI component

document.getElementById('sync-btn').addEventListener('click', async () => {
  const button = event.target;
  button.disabled = true;
  button.textContent = 'Syncing...';

  try {
    await APIPromise.syncFull({
      conversationId: getCurrentConversationId(),
      messages: getAllMessages()
    });

    button.textContent = '✅ Synced!';
    setTimeout(() => {
      button.textContent = 'Sync to Backend';
      button.disabled = false;
    }, 2000);

  } catch (error) {
    button.textContent = '❌ Failed';
    alert('Sync failed: ' + error.message);
    button.disabled = false;
  }
});
```

### Scenario 3: Batch Processing

```javascript
// Send multiple conversations in sequence

const conversations = [
  { conversationId: 'conv_1', messages: [/* ... */] },
  { conversationId: 'conv_2', messages: [/* ... */] },
  { conversationId: 'conv_3', messages: [/* ... */] }
];

// Fire-and-forget (all requests queued and processed automatically)
conversations.forEach(conv => {
  APIHelper.syncFull(conv);
});

// OR with Promise.all (wait for all to complete)
try {
  const results = await Promise.all(
    conversations.map(conv => APIPromise.syncFull(conv))
  );
  console.log('All synced!', results);
} catch (error) {
  console.error('One or more failed:', error);
}
```

### Scenario 4: Event Monitoring

```javascript
// In a monitoring/dashboard component

import { eventBus } from './content/core/eventBus.js';
import { EVENTS } from './content/core/constants.js';

class APIMonitor {
  constructor() {
    this.stats = {
      total: 0,
      success: 0,
      failed: 0,
      retries: 0
    };

    this.setupListeners();
  }

  setupListeners() {
    eventBus.on(EVENTS.API_REQUEST_START, () => {
      this.stats.total++;
      this.updateUI();
    });

    eventBus.on(EVENTS.API_REQUEST_SUCCESS, () => {
      this.stats.success++;
      this.updateUI();
    });

    eventBus.on(EVENTS.API_REQUEST_FAILED, () => {
      this.stats.failed++;
      this.updateUI();
    });

    eventBus.on(EVENTS.API_REQUEST_RETRY, () => {
      this.stats.retries++;
      this.updateUI();
    });

    eventBus.on(EVENTS.API_CIRCUIT_OPEN, () => {
      this.showAlert('API temporarily unavailable');
    });
  }

  updateUI() {
    document.getElementById('api-stats').textContent =
      `Success: ${this.stats.success} | Failed: ${this.stats.failed} | Retries: ${this.stats.retries}`;
  }

  showAlert(message) {
    const alert = document.createElement('div');
    alert.className = 'alert alert-warning';
    alert.textContent = message;
    document.body.appendChild(alert);
  }
}

const monitor = new APIMonitor();
```

### Scenario 5: Incremental Sync

```javascript
// Track changes and send only deltas

class IncrementalSyncer {
  constructor() {
    this.lastSyncedState = null;
    this.pendingChanges = [];
  }

  trackChange(change) {
    this.pendingChanges.push({
      ...change,
      timestamp: new Date().toISOString()
    });
  }

  async syncChanges() {
    if (this.pendingChanges.length === 0) {
      console.log('No changes to sync');
      return;
    }

    try {
      const result = await APIPromise.syncIncremental({
        conversationId: getCurrentConversationId(),
        changes: this.pendingChanges
      });

      console.log(`Synced ${this.pendingChanges.length} changes`);
      this.pendingChanges = [];
      this.lastSyncedState = result;

    } catch (error) {
      console.error('Incremental sync failed:', error);
      // Keep changes in queue for retry
    }
  }
}

// Use it
const syncer = new IncrementalSyncer();

// Track message added
eventBus.on(EVENTS.MESSAGE_INPUT, (data) => {
  syncer.trackChange({
    type: 'message_added',
    messageId: data.messageId,
    data: data
  });
});

// Sync every 30 seconds
setInterval(() => syncer.syncChanges(), 30000);
```

### Scenario 6: Analytics Tracking

```javascript
// Track user interactions

class AnalyticsTracker {
  track(eventName, properties = {}) {
    APIHelper.trackEvent(eventName, {
      ...properties,
      sessionId: this.getSessionId(),
      userId: this.getUserId(),
      timestamp: new Date().toISOString()
    });
  }

  trackConversationStart(conversationId) {
    this.track('conversation_started', { conversationId });
  }

  trackMessageSent(messageId, wordCount) {
    this.track('message_sent', { messageId, wordCount });
  }

  trackError(error, context) {
    this.track('error_occurred', {
      error: error.message,
      stack: error.stack,
      context
    });
  }

  getSessionId() {
    return sessionStorage.getItem('sessionId') || this.createSession();
  }

  getUserId() {
    return localStorage.getItem('userId') || 'anonymous';
  }

  createSession() {
    const sessionId = `session_${Date.now()}`;
    sessionStorage.setItem('sessionId', sessionId);
    return sessionId;
  }
}

// Use it
const analytics = new AnalyticsTracker();

eventBus.on(EVENTS.MESSAGE_INPUT, (data) => {
  analytics.trackMessageSent(data.messageId, data.text.split(' ').length);
});

eventBus.on(EVENTS.STREAM_START, (data) => {
  analytics.trackConversationStart(data.conversationId);
});
```

### Scenario 7: Custom API Endpoint

```javascript
// Call custom backend endpoint

async function uploadAttachment(file, conversationId) {
  // Convert file to base64
  const base64 = await fileToBase64(file);

  // Send via custom endpoint
  const response = await APIPromise.makeRequest({
    method: 'POST',
    endpoint: '/api/attachments',
    data: {
      conversationId,
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      content: base64
    },
    headers: {
      'X-Upload-Source': 'chatgpt-extension'
    }
  });

  return response.attachmentId;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
```

### Scenario 8: Error Recovery

```javascript
// Retry failed requests manually

class FailedRequestManager {
  constructor() {
    this.failedRequests = [];
    this.setupListeners();
  }

  setupListeners() {
    eventBus.on(EVENTS.API_REQUEST_FAILED, (data) => {
      this.failedRequests.push({
        request: data.request,
        error: data.error,
        failedAt: Date.now()
      });
    });
  }

  async retryAll() {
    console.log(`Retrying ${this.failedRequests.length} failed requests`);

    const results = await Promise.allSettled(
      this.failedRequests.map(({ request }) =>
        APIPromise.makeRequest(request)
      )
    );

    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`Retry results: ${succeeded} succeeded, ${failed} failed`);

    // Clear succeeded requests
    this.failedRequests = this.failedRequests.filter((_, index) =>
      results[index].status === 'rejected'
    );

    return { succeeded, failed };
  }

  clearAll() {
    this.failedRequests = [];
  }
}

// Use it
const failedManager = new FailedRequestManager();

// Add retry button
document.getElementById('retry-btn').addEventListener('click', async () => {
  const result = await failedManager.retryAll();
  alert(`Retried: ${result.succeeded} succeeded, ${result.failed} failed`);
});
```

## Testing Examples

### Test Health Check

```javascript
// In console
window.chatGPTMessages.api.healthCheck();

// Listen for response
eventBus.on(EVENTS.API_REQUEST_SUCCESS, (data) => {
  console.log('Health check response:', data.response);
});
```

### Test with Mock Backend

```javascript
// Intercept all API requests and mock responses
eventBus.on(EVENTS.API_REQUEST, (request) => {
  console.log('Mock: Intercepted request', request);

  setTimeout(() => {
    eventBus.emit(EVENTS.API_REQUEST_SUCCESS, {
      requestId: 'mock_' + Date.now(),
      request,
      response: {
        success: true,
        message: 'Mocked response',
        data: request.data
      }
    });
  }, 1000);
});
```

### Integration Test

```javascript
describe('API Client Integration', () => {
  it('should sync conversation successfully', async () => {
    const conversation = {
      conversationId: 'test_conv_123',
      messages: [
        { messageId: 'msg_1', role: 'user', content: 'Test' }
      ]
    };

    const response = await APIPromise.syncFull(conversation);

    expect(response.success).toBe(true);
    expect(response.conversationId).toBe('test_conv_123');
  });

  it('should handle failures gracefully', async () => {
    // Mock a failure
    const badRequest = {
      method: 'GET',
      endpoint: '/api/nonexistent'
    };

    await expect(
      APIPromise.makeRequest(badRequest)
    ).rejects.toThrow();
  });
});
```

## Configuration Examples

### Development vs Production

```javascript
// In constants.js

const isDevelopment = process.env.NODE_ENV === 'development';

export const API_CONFIG = {
  BASE_URL: isDevelopment
    ? 'http://localhost:3000'
    : 'https://api.semantix.ai',
  TIMEOUT: isDevelopment ? 60000 : 30000,
  RETRY_ATTEMPTS: isDevelopment ? 1 : 3,
  AUTO_SYNC: !isDevelopment, // Manual sync in dev
};
```

### Custom Configuration Per Request

```javascript
// Override config for specific request
APIHelper.customRequest({
  method: 'POST',
  endpoint: '/api/large-upload',
  data: largePayload,
  timeout: 120000, // 2 minutes for large uploads
  retryAttempts: 5
});
```

## Best Practices

✅ **Use fire-and-forget for non-critical operations**
✅ **Use promises when you need confirmation**
✅ **Listen to events for UI updates**
✅ **Batch related requests**
✅ **Handle circuit breaker gracefully**
✅ **Track analytics for insights**
✅ **Keep request payloads small**
✅ **Use incremental sync when possible**

## Common Patterns

**Pattern 1: Optimistic UI Update**
```javascript
// Update UI immediately, rollback on failure
updateUIOptimistically(data);

try {
  await APIPromise.sendConversation(data);
} catch (error) {
  rollbackUIUpdate(data);
  showError(error);
}
```

**Pattern 2: Debounced Sync**
```javascript
const debouncedSync = debounce(() => {
  APIHelper.syncFull(getCurrentConversation());
}, 5000);

// Call on every change
eventBus.on(EVENTS.MESSAGE_INPUT, debouncedSync);
```

**Pattern 3: Offline Queue**
```javascript
if (navigator.onLine) {
  APIHelper.syncFull(data);
} else {
  queueForLater(data);
}

window.addEventListener('online', () => {
  processOfflineQueue();
});
```
