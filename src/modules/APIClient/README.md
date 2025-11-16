# API Client Module

Event-driven HTTP client for backend communication with automatic retry, rate limiting, and error recovery.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Event-Driven Flow                      │
└─────────────────────────────────────────────────────────────┘

User Action / Stream Complete
         ↓
    APIHelper.sendConversation()
         ↓
    eventBus.emit(EVENTS.API_REQUEST)
         ↓
    APIClient.enqueueRequest()
         ↓
    Request Queue (max 5 concurrent)
         ↓
    APIClient.executeRequest()
         ├─ Success → emit(API_REQUEST_SUCCESS)
         ├─ Retry   → emit(API_REQUEST_RETRY)
         └─ Failed  → emit(API_REQUEST_FAILED)
         ↓
    API Event Handlers
         ├─ Update storage
         ├─ Update conversation metadata
         └─ Notify user
```

## Features

✅ **Request Queue** - Maximum concurrent requests (default: 5)
✅ **Retry Logic** - Exponential backoff with jitter (default: 3 attempts)
✅ **Circuit Breaker** - Auto-disable after repeated failures (threshold: 5)
✅ **Timeout Handling** - Configurable timeouts (default: 30s)
✅ **Event-Driven** - All state changes emit events
✅ **Request Tracking** - Full history and status monitoring
✅ **Auto-Sync** - Optional automatic conversation syncing

## Configuration

Configuration is set in [`constants.js`](../../content/core/constants.js):

```javascript
export const API_CONFIG = {
  BASE_URL: 'http://localhost:3000',
  TIMEOUT: 30000,              // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,           // 1 second base delay
  MAX_CONCURRENT: 5,           // Max parallel requests
  AUTO_SYNC: true,             // Auto-sync on stream complete
};
```

## Usage Examples

### 1. Fire-and-Forget (Event-Based)

Use when you don't need to wait for the response:

```javascript
import { APIHelper } from './modules/APIClient/helpers.js';

// Send conversation (returns immediately)
APIHelper.sendConversation({
  conversationId: 'conv_123',
  title: 'My Conversation',
  messages: [
    { messageId: 'msg_1', role: 'user', content: 'Hello' },
    { messageId: 'msg_2', role: 'assistant', content: 'Hi there!' }
  ]
});

// Track analytics event
APIHelper.trackEvent('conversation_created', {
  conversationId: 'conv_123',
  messageCount: 2
});
```

### 2. Promise-Based (Async/Await)

Use when you need to wait for the response:

```javascript
import { APIPromise } from './modules/APIClient/helpers.js';

async function syncConversation() {
  try {
    const response = await APIPromise.sendConversation({
      conversationId: 'conv_123',
      messages: [...]
    });

    console.log('Synced successfully:', response);
  } catch (error) {
    console.error('Sync failed:', error);
  }
}
```

### 3. Listen to API Events

```javascript
import { eventBus } from './content/core/eventBus.js';
import { EVENTS } from './content/core/constants.js';

// Listen for successful requests
eventBus.on(EVENTS.API_REQUEST_SUCCESS, (data) => {
  console.log('Request succeeded:', data.requestId, data.response);
});

// Listen for failures
eventBus.on(EVENTS.API_REQUEST_FAILED, (data) => {
  console.error('Request failed:', data.requestId, data.error);
});

// Listen for retry attempts
eventBus.on(EVENTS.API_REQUEST_RETRY, (data) => {
  console.log('Retrying...', data.nextAttempt);
});

// Circuit breaker events
eventBus.on(EVENTS.API_CIRCUIT_OPEN, (data) => {
  console.warn('API temporarily unavailable');
});
```

### 4. Custom Requests

```javascript
import { APIHelper } from './modules/APIClient/helpers.js';

APIHelper.customRequest({
  method: 'POST',
  endpoint: '/api/custom/endpoint',
  data: { custom: 'data' },
  headers: {
    'X-Custom-Header': 'value'
  }
});
```

## Available Endpoints

All endpoints are defined in [`endpoints.js`](./endpoints.js):

### Conversations
- `POST /api/conversations` - Create conversation
- `GET /api/conversations/:id` - Get conversation
- `PUT /api/conversations/:id` - Update conversation
- `GET /api/conversations` - List conversations
- `DELETE /api/conversations/:id` - Delete conversation

### Messages
- `POST /api/conversations/:conversationId/messages` - Add message
- `GET /api/messages/:id` - Get message
- `PUT /api/messages/:id` - Update message
- `GET /api/conversations/:conversationId/messages` - List messages

### Sync
- `POST /api/sync/full` - Full sync
- `POST /api/sync/incremental` - Incremental sync
- `GET /api/sync/status` - Sync status

### Analytics
- `POST /api/analytics/events` - Track event
- `GET /api/analytics/metrics` - Get metrics

### Health
- `GET /api/health` - Health check

## API Events

All API events are emitted through the event bus:

| Event | Description | Data |
|-------|-------------|------|
| `API_REQUEST` | Request initiated | `{ method, endpoint, data }` |
| `API_REQUEST_QUEUED` | Request added to queue | `{ requestId, request }` |
| `API_REQUEST_START` | Request execution started | `{ requestId, request }` |
| `API_REQUEST_SUCCESS` | Request succeeded | `{ requestId, request, response }` |
| `API_REQUEST_FAILED` | Request failed (after retries) | `{ requestId, request, error }` |
| `API_REQUEST_RETRY` | Retry attempt scheduled | `{ requestId, request, error, nextAttempt }` |
| `API_CIRCUIT_OPEN` | Circuit breaker activated | `{ failures, threshold }` |
| `API_CIRCUIT_CLOSED` | Circuit breaker restored | `{}` |
| `API_SYNC_START` | Sync started | `{ conversationId, syncType }` |
| `API_SYNC_COMPLETE` | Sync completed | `{ conversationId, syncType, result }` |
| `API_SYNC_ERROR` | Sync error | `{ conversationId, syncType, error }` |

## Auto-Sync Integration

When `AUTO_SYNC` is enabled, conversations are automatically synced when streams complete:

```javascript
// In streamHandlers.js
export function handleStreamComplete(data, managers) {
  const { messageId, conversationId } = data;

  // ... existing code ...

  // Auto-sync happens automatically via APIClient
  // It listens to STREAM_COMPLETE events
}
```

The APIClient automatically:
1. Listens for `STREAM_COMPLETE` events
2. Gathers conversation data
3. Queues sync request
4. Handles retries if needed

## Request Queue & Concurrency

The API client maintains a request queue to:
- Limit concurrent requests (default: 5)
- Preserve request order
- Handle rate limiting
- Manage retries

```javascript
// Queue statistics
const stats = apiClient.getStats();
console.log(stats);
// {
//   queueLength: 3,
//   activeRequests: 5,
//   circuitBreaker: { state: 'closed', failures: 0 },
//   totalProcessed: 127
// }
```

## Retry Logic

Exponential backoff with jitter:

```
Attempt 1: 1000ms + random(0-1000ms)
Attempt 2: 2000ms + random(0-1000ms)
Attempt 3: 4000ms + random(0-1000ms)
Max delay: 30000ms (30s)
```

After 3 failed attempts, the request is marked as FAILED and an event is emitted.

## Circuit Breaker

Protects against cascading failures:

- **Threshold**: 5 consecutive failures
- **Timeout**: 60 seconds (1 minute)
- **States**:
  - `closed` - Normal operation
  - `open` - All requests blocked
  - `half-open` - Testing with one request

When the circuit opens:
1. All new requests are queued but not executed
2. After timeout, state changes to `half-open`
3. One test request is sent
4. If successful, circuit closes; if failed, reopens

## Error Handling

Event handlers in [`apiHandlers.js`](../../content/modules/eventHandlers/apiHandlers.js) handle:

✅ Update storage with request status
✅ Update conversation sync metadata
✅ Store failed requests for manual retry
✅ Log errors with context
✅ Notify user (can trigger UI notifications)

## Testing

### Manual Testing

```javascript
// In browser console (after extension loads)

// Test health check
window.chatGPTMessages.api = {
  healthCheck: () => APIHelper.healthCheck()
};

// Test conversation sync
window.chatGPTMessages.api.sync = (convId) => {
  APIHelper.syncFull({
    conversationId: convId,
    messages: window.chatGPTMessages.getAllMessages(convId)
  });
};
```

### Mock Backend Response

For development without a backend:

```javascript
// In console
eventBus.on(EVENTS.API_REQUEST, (request) => {
  // Mock success after 1 second
  setTimeout(() => {
    eventBus.emit(EVENTS.API_REQUEST_SUCCESS, {
      requestId: 'mock_id',
      request,
      response: { success: true, data: 'mocked' }
    });
  }, 1000);
});
```

## File Structure

```
src/modules/APIClient/
├── index.js          # Main APIClient class
├── endpoints.js      # Endpoint definitions & request builders
├── helpers.js        # Helper utilities (APIHelper, APIPromise)
└── README.md         # This file

src/content/modules/eventHandlers/
└── apiHandlers.js    # API event handlers

src/content/core/
├── constants.js      # API events & config
└── Application.js    # APIClient integration
```

## Integration Points

The API client integrates with:

1. **Application.js** - Initialized on app start
2. **Event Registry** - Auto-registered handlers
3. **Storage Manager** - Request tracking
4. **Conversation Manager** - Sync status updates
5. **Public API** - Exposed methods for external use

## Next Steps

To connect to your backend:

1. Update `API_CONFIG.BASE_URL` in `constants.js`
2. Implement backend endpoints matching `endpoints.js`
3. Test with `APIHelper.healthCheck()`
4. Enable auto-sync with `AUTO_SYNC: true`
5. Monitor events in browser console

## Best Practices

✅ Use `APIHelper` for fire-and-forget requests
✅ Use `APIPromise` when you need responses
✅ Listen to events for UI updates
✅ Keep request payloads small
✅ Use incremental sync when possible
✅ Handle circuit breaker events gracefully
✅ Log failed requests for debugging

## Troubleshooting

**Requests not sending?**
- Check `API_CONFIG.BASE_URL` is correct
- Check circuit breaker state with `apiClient.getStats()`
- Check browser console for errors

**Circuit breaker stuck open?**
- Check backend is running
- Wait 60 seconds for auto-recovery
- Check failure threshold (default: 5)

**Requests timing out?**
- Increase `TIMEOUT` in config
- Check network connectivity
- Check backend response time
