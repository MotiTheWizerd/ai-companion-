# API Client Quick Reference

**One-page reference for the API client.**

## Import

```javascript
import { APIHelper } from './modules/APIClient/helpers.js';
import { APIPromise } from './modules/APIClient/helpers.js';
import { eventBus } from './content/core/eventBus.js';
import { EVENTS } from './content/core/constants.js';
```

## Quick Start

### Fire-and-Forget
```javascript
APIHelper.syncFull({ conversationId: 'conv_123', messages: [...] });
```

### Promise-Based
```javascript
const response = await APIPromise.syncFull({ conversationId: 'conv_123', messages: [...] });
```

### Browser Console
```javascript
window.chatGPTMessages.api.healthCheck();
window.chatGPTMessages.api.syncConversation();
```

## Common Methods

### APIHelper (Fire-and-Forget)
```javascript
APIHelper.syncFull(conversationData)
APIHelper.syncIncremental(changes)
APIHelper.sendConversation(data)
APIHelper.addMessage(conversationId, message)
APIHelper.updateConversation(conversationId, updates)
APIHelper.trackEvent(eventName, data)
APIHelper.healthCheck()
APIHelper.getConversation(conversationId)
APIHelper.listConversations({ page, limit, filter })
APIHelper.customRequest({ method, endpoint, data })
```

### APIPromise (Async/Await)
```javascript
await APIPromise.syncFull(data)
await APIPromise.sendConversation(data)
await APIPromise.addMessage(conversationId, message)
await APIPromise.makeRequest({ method, endpoint, data })
```

## Events

### Listen to Events
```javascript
// Success
eventBus.on(EVENTS.API_REQUEST_SUCCESS, (data) => {
  console.log('Success:', data.response);
});

// Failure
eventBus.on(EVENTS.API_REQUEST_FAILED, (data) => {
  console.error('Failed:', data.error);
});

// Retry
eventBus.on(EVENTS.API_REQUEST_RETRY, (data) => {
  console.log('Retrying...', data.nextAttempt);
});

// Circuit Breaker
eventBus.on(EVENTS.API_CIRCUIT_OPEN, () => {
  console.warn('API unavailable');
});
```

### All Events
```javascript
API_REQUEST          // Request initiated
API_REQUEST_QUEUED   // Added to queue
API_REQUEST_START    // Execution started
API_REQUEST_SUCCESS  // Success
API_REQUEST_FAILED   // Failed (after retries)
API_REQUEST_RETRY    // Retry scheduled
API_CIRCUIT_OPEN     // Circuit breaker open
API_CIRCUIT_CLOSED   // Circuit breaker closed
API_SYNC_START       // Sync started
API_SYNC_COMPLETE    // Sync completed
API_SYNC_ERROR       // Sync error
```

## Configuration

### Default Config (in `constants.js`)
```javascript
API_CONFIG.BASE_URL = 'http://localhost:3000'
API_CONFIG.TIMEOUT = 30000              // 30 seconds
API_CONFIG.RETRY_ATTEMPTS = 3
API_CONFIG.RETRY_DELAY = 1000           // 1 second
API_CONFIG.MAX_CONCURRENT = 5           // Max parallel requests
API_CONFIG.AUTO_SYNC = true
```

### Change Config
```javascript
// Edit src/content/core/constants.js
export const API_CONFIG = {
  BASE_URL: 'https://api.yourdomain.com',
  TIMEOUT: 60000,
  // ...
};
```

## Endpoints

### Conversations
```javascript
POST   /api/conversations           // Create
GET    /api/conversations/:id       // Get
PUT    /api/conversations/:id       // Update
GET    /api/conversations           // List
DELETE /api/conversations/:id       // Delete
```

### Messages
```javascript
POST   /api/conversations/:conversationId/messages  // Create
GET    /api/messages/:id                            // Get
PUT    /api/messages/:id                            // Update
GET    /api/conversations/:conversationId/messages  // List
```

### Sync
```javascript
POST   /api/sync/full           // Full sync
POST   /api/sync/incremental    // Incremental sync
GET    /api/sync/status         // Status
```

### Analytics
```javascript
POST   /api/analytics/events    // Track event
GET    /api/analytics/metrics   // Get metrics
```

### Health
```javascript
GET    /api/health              // Health check
```

## Common Patterns

### Auto-Sync on Stream Complete
```javascript
// Already built-in! Just enable AUTO_SYNC
API_CONFIG.AUTO_SYNC = true
```

### Manual Sync Button
```javascript
button.addEventListener('click', async () => {
  try {
    await APIPromise.syncFull(getCurrentConversation());
    showSuccess();
  } catch (error) {
    showError(error);
  }
});
```

### Track Analytics
```javascript
APIHelper.trackEvent('conversation_started', {
  conversationId: 'conv_123',
  timestamp: new Date().toISOString()
});
```

### Batch Processing
```javascript
conversations.forEach(conv => {
  APIHelper.syncFull(conv);
});
// All requests queued and processed automatically!
```

### Error Monitoring
```javascript
let errorCount = 0;

eventBus.on(EVENTS.API_REQUEST_FAILED, () => {
  errorCount++;
  if (errorCount > 10) {
    notifyAdmin('High error rate detected');
  }
});
```

### Custom Request
```javascript
APIHelper.customRequest({
  method: 'POST',
  endpoint: '/api/custom/action',
  data: { custom: 'data' },
  headers: { 'X-Custom-Header': 'value' }
});
```

## Troubleshooting

### Requests Not Sending?
```javascript
// Check base URL
console.log(API_CONFIG.BASE_URL);

// Check circuit breaker
apiClient.getStats();
// { circuitBreaker: { state: 'closed' }, ... }
```

### Circuit Breaker Open?
```javascript
// Wait 60 seconds for auto-recovery
// OR restart extension
// OR check backend is running
```

### Timeouts?
```javascript
// Increase timeout
API_CONFIG.TIMEOUT = 60000; // 60 seconds
```

### Too Many Retries?
```javascript
// Reduce retry attempts
API_CONFIG.RETRY_ATTEMPTS = 1;
```

## Debug Mode

### Console Monitoring
```javascript
// Monitor all API events
Object.values(EVENTS)
  .filter(event => event.startsWith('api:'))
  .forEach(event => {
    eventBus.on(event, (data) => {
      console.log(`[${event}]`, data);
    });
  });
```

### Request History
```javascript
// Access via APIClient instance
// (Available in Application.js)
apiClient.requestHistory.forEach((req, id) => {
  console.log(id, req.status, req);
});
```

## Public API (Browser Console)

```javascript
// On ChatGPT page after extension loads

// Health check
window.chatGPTMessages.api.healthCheck()

// Sync current conversation
window.chatGPTMessages.api.syncConversation()

// Sync by ID
window.chatGPTMessages.api.syncById('conv_123')

// Track event
window.chatGPTMessages.api.trackEvent('test_event', { key: 'value' })

// Get conversation
window.chatGPTMessages.getConversation()

// Export to file
window.chatGPTMessages.exportToFile()
```

## Testing

### Test Health Check
```javascript
window.chatGPTMessages.api.healthCheck()

// Listen for response
eventBus.on(EVENTS.API_REQUEST_SUCCESS, console.log)
```

### Mock Responses
```javascript
// Intercept and mock all requests
eventBus.on(EVENTS.API_REQUEST, (req) => {
  setTimeout(() => {
    eventBus.emit(EVENTS.API_REQUEST_SUCCESS, {
      requestId: 'mock_id',
      request: req,
      response: { success: true, mocked: true }
    });
  }, 1000);
});
```

## File Locations

```
src/modules/APIClient/
├── index.js              - Main client
├── endpoints.js          - Endpoint definitions
├── helpers.js            - APIHelper & APIPromise
├── README.md             - Full docs
├── USAGE_EXAMPLES.md     - Real examples
└── QUICK_REFERENCE.md    - This file

src/content/core/
├── constants.js          - Events & config
└── Application.js        - Integration

src/content/modules/eventHandlers/
├── apiHandlers.js        - Event handlers
└── registry.js           - Handler registry
```

## Key Features

✅ Request queue (max 5 concurrent)
✅ Auto-retry (3 attempts with backoff)
✅ Circuit breaker (5 failure threshold)
✅ Timeout handling (30s default)
✅ Event-driven (11 events)
✅ Request tracking
✅ Auto-sync
✅ Error recovery
✅ Public API

## One-Liners

```javascript
// Sync conversation
APIHelper.syncFull({ conversationId: 'conv_123', messages: [...] })

// Track event
APIHelper.trackEvent('action', { data: 'value' })

// Health check
APIHelper.healthCheck()

// Custom request
APIHelper.customRequest({ method: 'POST', endpoint: '/api/custom', data: {} })

// Promise-based
const res = await APIPromise.syncFull({ conversationId: 'conv_123', messages: [...] })

// Console
window.chatGPTMessages.api.syncConversation()
```

---

**For full documentation**: See `README.md`
**For examples**: See `USAGE_EXAMPLES.md`
**For implementation details**: See `API_CLIENT_IMPLEMENTATION.md`
