# Migration Guide: APIClient Refactoring

## Overview

The APIClient module has been refactored from a monolithic structure to a modular architecture. **Good news: The public API remains unchanged**, so most code will continue to work without modifications.

## What Changed?

### File Structure Changes

**Before:**
```
src/modules/APIClient/
├── index.js                   (354 lines - everything in one file)
├── RequestQueue.js
├── CircuitBreaker.js
├── RetryPolicy.js
├── RequestExecutor.js
├── helpers.js
└── helpers/
```

**After:**
```
src/modules/APIClient/
├── index.js                   (147 lines - slim orchestrator)
├── core/                      [NEW]
│   ├── ConfigurationManager.js
│   ├── RequestStateManager.js
│   ├── RequestLifecycleHandler.js
│   └── EventListenerManager.js
├── services/                  [NEW - moved from root]
│   ├── RequestQueue.js
│   ├── CircuitBreaker.js
│   ├── RetryPolicy.js
│   └── RequestExecutor.js
├── types/                     [NEW]
│   └── constants.js
├── helpers.js
└── helpers/
```

## No Breaking Changes

### ✅ Public API Unchanged

**All existing code continues to work:**

```javascript
// ✅ Still works exactly the same
import { APIClient } from '../../modules/APIClient/index.js';

const api = new APIClient({
  baseURL: 'http://localhost:3000',
  timeout: 30000,
  retryAttempts: 3,
});

api.init();

const requestId = api.enqueueRequest({
  method: 'POST',
  endpoint: '/api/conversations',
  data: { message: 'Hello' },
});

const status = api.getRequestStatus(requestId);
const stats = api.getStats();
```

### ✅ Helper Functions Unchanged

```javascript
// ✅ Still works
import { APIHelper } from '../../modules/APIClient/helpers/index.js';

APIHelper.syncFull(conversation);
APIHelper.trackEvent('user_action', data);
APIHelper.healthCheck();
```

### ✅ Events Unchanged

```javascript
// ✅ All events still work
import { eventBus } from './eventBus.js';
import { EVENTS } from './constants.js';

eventBus.emit(EVENTS.API_REQUEST, {
  method: 'GET',
  endpoint: '/users',
});

eventBus.on(EVENTS.API_REQUEST_SUCCESS, (data) => {
  console.log('Success:', data.response);
});
```

## What You Might Need to Update

### 1. Internal Imports (Only if you import internal modules)

If you were directly importing internal modules (you probably weren't), update paths:

**Before:**
```javascript
import { RequestQueue } from '../../modules/APIClient/RequestQueue.js';
import { CircuitBreaker } from '../../modules/APIClient/CircuitBreaker.js';
```

**After:**
```javascript
import { RequestQueue } from '../../modules/APIClient/services/RequestQueue.js';
import { CircuitBreaker } from '../../modules/APIClient/services/CircuitBreaker.js';
```

### 2. Constants

If you used `REQUEST_STATUS` constants:

**Before:**
```javascript
// Defined inline in index.js
const REQUEST_STATUS = { ... }
```

**After:**
```javascript
import { REQUEST_STATUS } from '../../modules/APIClient/types/constants.js';

console.log(REQUEST_STATUS.PENDING);  // 'pending'
console.log(REQUEST_STATUS.SUCCESS);  // 'success'
```

### 3. New Event: API_PROCESS_QUEUE

A new event was added for internal queue processing:

```javascript
import { EVENTS } from './constants.js';

// New event (already added to constants.js)
eventBus.emit(EVENTS.API_PROCESS_QUEUE);
```

This is used internally and you typically don't need to emit it manually.

## Benefits for Developers

### 1. Better Code Organization

Find what you need faster:
- Config issues? → `core/ConfigurationManager.js`
- State tracking? → `core/RequestStateManager.js`
- Execution flow? → `core/RequestLifecycleHandler.js`
- Events? → `core/EventListenerManager.js`

### 2. Easier Testing

Each module can be tested independently:

```javascript
// Test RequestStateManager
import { RequestStateManager } from './core/RequestStateManager.js';

const mockQueue = {
  getActive: jest.fn(),
};

const stateManager = new RequestStateManager(mockQueue);
const request = stateManager.createQueuedRequest({
  method: 'GET',
  endpoint: '/test',
});

expect(request.id).toBeDefined();
expect(request.status).toBe('pending');
expect(request.attempts).toBe(0);
```

### 3. Clear Responsibilities

Each module has a single, clear purpose:

| Module | Purpose |
|--------|---------|
| ConfigurationManager | Manage configuration and initialize services |
| RequestStateManager | Track request state and history |
| RequestLifecycleHandler | Handle request execution flow |
| EventListenerManager | Manage event subscriptions |

### 4. Easy Extension

Want to add new features? Clear extension points:

```javascript
// Add custom retry strategy
import { RetryPolicy } from './services/RetryPolicy.js';

const customPolicy = new RetryPolicy({
  maxAttempts: 5,
  baseDelay: 500,
  maxDelay: 10000,
});

// Add custom event listener
import { EventListenerManager } from './core/EventListenerManager.js';

class CustomEventManager extends EventListenerManager {
  setupEventListeners() {
    super.setupEventListeners();

    // Add custom listeners
    eventBus.on(EVENTS.CUSTOM_EVENT, (data) => {
      this.handleCustomEvent(data);
    });
  }
}
```

## Debugging Guide

### Finding Issues

**Old approach:**
- Open `index.js` (354 lines)
- Search for relevant method
- Navigate complex interdependencies

**New approach:**
- Identify the concern:
  - Config? → `core/ConfigurationManager.js`
  - State? → `core/RequestStateManager.js`
  - Execution? → `core/RequestLifecycleHandler.js`
  - Events? → `core/EventListenerManager.js`
- Open focused file (~100-150 lines)
- Clear, single-responsibility code

### Common Issues & Solutions

#### Issue: "Cannot find module RequestQueue"

**Cause:** Trying to import from old location

**Solution:**
```javascript
// ❌ Old
import { RequestQueue } from './RequestQueue.js';

// ✅ New
import { RequestQueue } from './services/RequestQueue.js';
```

#### Issue: "REQUEST_STATUS is not defined"

**Cause:** Constants moved to separate file

**Solution:**
```javascript
// ✅ Import from types
import { REQUEST_STATUS } from './types/constants.js';
```

#### Issue: "Events not firing"

**Cause:** Event listeners not set up

**Solution:**
```javascript
// Make sure to call init()
const api = new APIClient(config);
api.init();  // ← This sets up event listeners
```

## Testing Guide

### Unit Testing Individual Modules

**ConfigurationManager:**
```javascript
import { ConfigurationManager } from './core/ConfigurationManager.js';

test('creates config with defaults', () => {
  const config = ConfigurationManager.createConfig();

  expect(config.baseURL).toBe('http://localhost:3000');
  expect(config.timeout).toBe(30000);
  expect(config.queue).toBeDefined();
  expect(config.circuitBreaker).toBeDefined();
});
```

**RequestStateManager:**
```javascript
import { RequestStateManager } from './core/RequestStateManager.js';

test('generates unique request IDs', () => {
  const manager = new RequestStateManager(mockQueue);

  const id1 = manager.generateRequestId();
  const id2 = manager.generateRequestId();

  expect(id1).not.toBe(id2);
  expect(id1).toMatch(/^req_\d+_/);
});
```

**RequestLifecycleHandler:**
```javascript
import { RequestLifecycleHandler } from './core/RequestLifecycleHandler.js';

test('handles successful request', async () => {
  const mockExecutor = {
    execute: jest.fn().mockResolvedValue({ data: 'success' }),
  };

  const handler = new RequestLifecycleHandler({
    executor: mockExecutor,
    circuitBreaker: mockCircuitBreaker,
    retryPolicy: mockRetryPolicy,
    stateManager: mockStateManager,
    queue: mockQueue,
    config: mockConfig,
  });

  await handler.executeRequest(mockRequest);

  expect(mockExecutor.execute).toHaveBeenCalled();
  expect(mockCircuitBreaker.recordSuccess).toHaveBeenCalled();
});
```

### Integration Testing

```javascript
import { APIClient } from './index.js';

test('complete request flow', async () => {
  const api = new APIClient({
    baseURL: 'http://localhost:3000',
  });

  api.init();

  const requestId = api.enqueueRequest({
    method: 'GET',
    endpoint: '/users',
  });

  expect(requestId).toBeDefined();
  expect(requestId).toMatch(/^req_/);

  const status = api.getRequestStatus(requestId);
  expect(status).toBeDefined();
});
```

## Performance Impact

### Positive Changes
- ✅ Smaller module sizes = faster parsing
- ✅ Better code splitting = smaller bundles
- ✅ Clearer structure = easier optimization

### Neutral Changes
- ⚖️ Slight increase in function calls (negligible)
- ⚖️ More files (but bundled in production)

### Benchmarks

The refactoring has **no measurable performance impact**:

- Request processing: Same
- Queue operations: Same
- Circuit breaker checks: Same
- Memory usage: Same

## Rollback Plan (If Needed)

If you encounter issues, you can temporarily revert:

1. **Restore old index.js** from git history
2. **Move services back to root:**
   ```bash
   mv services/* .
   rmdir services
   ```
3. **Remove new folders:**
   ```bash
   rm -rf core/ types/
   ```

However, this should **not be necessary** as the public API is unchanged.

## Getting Help

If you encounter issues:

1. **Check this guide** - Most common issues are covered
2. **Check ARCHITECTURE.md** - Understand the new structure
3. **Check REFACTORING_SUMMARY.md** - See what changed
4. **Check the code** - Each module is small and well-documented

## Summary

### ✅ What Works Without Changes
- All public API methods
- All helper functions
- All events
- All imports from `index.js`

### ⚠️ What Might Need Updates
- Direct imports of internal modules (rare)
- Custom extensions to internal classes
- Direct use of `REQUEST_STATUS` constants

### 📚 New Resources
- `ARCHITECTURE.md` - System architecture
- `REFACTORING_SUMMARY.md` - What changed
- `MIGRATION_GUIDE.md` - This document

**Bottom line:** For most developers, this is a **transparent change** that improves code quality without requiring any modifications to existing code.
