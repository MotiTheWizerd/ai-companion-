# APIClient Architecture

## Module Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         APIClient                                │
│                    (Main Orchestrator)                           │
│                                                                   │
│  ┌────────────────┐  ┌──────────────────┐  ┌─────────────────┐ │
│  │ Configuration  │  │  Request State   │  │  Lifecycle      │ │
│  │   Manager      │  │    Manager       │  │   Handler       │ │
│  └────────────────┘  └──────────────────┘  └─────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Event Listener Manager                         │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Uses
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Services Layer                           │
│                                                                   │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────────────┐ │
│  │   Request    │  │    Circuit    │  │     Retry Policy     │ │
│  │    Queue     │  │   Breaker     │  │                      │ │
│  └──────────────┘  └───────────────┘  └──────────────────────┘ │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Request Executor                             │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Core Modules

### 1. ConfigurationManager

**Purpose:** Centralized configuration and service initialization

```
┌──────────────────────────────────────────┐
│      ConfigurationManager                │
├──────────────────────────────────────────┤
│  + createConfig(userConfig)              │
│  + updateConfig(newConfig, services)     │
│  + validateConfig(config)                │
├──────────────────────────────────────────┤
│  Initializes:                            │
│  • RequestQueue                          │
│  • CircuitBreaker                        │
│  • RetryPolicy                           │
│  • RequestExecutor                       │
└──────────────────────────────────────────┘
```

**Configuration Flow:**
```
User Config
    ↓
Merge with Defaults
    ↓
Create Services
    │
    ├→ RequestQueue(maxConcurrent)
    ├→ CircuitBreaker(threshold, timeout)
    ├→ RetryPolicy(maxAttempts, baseDelay)
    └→ RequestExecutor(baseURL, timeout)
    ↓
Return Complete Config
```

### 2. RequestStateManager

**Purpose:** Request state tracking and history management

```
┌──────────────────────────────────────────┐
│      RequestStateManager                 │
├──────────────────────────────────────────┤
│  + generateRequestId()                   │
│  + createQueuedRequest(request)          │
│  + storeInHistory(id, request, data)     │
│  + getRequestStatus(requestId)           │
│  + getStats(circuitBreaker, retryPolicy) │
│  + clearHistory()                        │
├──────────────────────────────────────────┤
│  State:                                  │
│  • requestHistory: Map<id, request>      │
│  • queue reference (for active requests) │
└──────────────────────────────────────────┘
```

**State Lifecycle:**
```
Create Request
    ↓
Generate ID + Metadata
    ↓
[PENDING] in Queue
    ↓
[IN_FLIGHT] in Active Map
    ↓
Success/Failure
    ↓
[SUCCESS/FAILED] in History
```

### 3. RequestLifecycleHandler

**Purpose:** Complete request execution flow

```
┌──────────────────────────────────────────┐
│     RequestLifecycleHandler              │
├──────────────────────────────────────────┤
│  + executeRequest(request)               │
│  + handleSuccess(request, response)      │
│  + handleFailure(request, error)         │
│  + scheduleRetry(request, error)         │
│  + handleFinalFailure(request, error)    │
├──────────────────────────────────────────┤
│  Dependencies:                           │
│  • RequestExecutor                       │
│  • CircuitBreaker                        │
│  • RetryPolicy                           │
│  • RequestStateManager                   │
│  • RequestQueue                          │
│  • eventBus                              │
└──────────────────────────────────────────┘
```

**Execution Flow:**
```
executeRequest()
    ↓
Emit: API_REQUEST_START
    ↓
RequestExecutor.execute()
    ↓
┌─────────────┐
│  Success?   │
└─────────────┘
    │         │
   YES       NO
    │         │
    ↓         ↓
handleSuccess  handleFailure
    │             │
    ↓             ↓
Store in      Should Retry?
History          │      │
    │           YES    NO
    ↓            │      │
Emit:            ↓      ↓
SUCCESS   scheduleRetry  handleFinalFailure
              │              │
              ↓              ↓
           Emit:         Emit: FAILED
           RETRY         Update Circuit
```

### 4. EventListenerManager

**Purpose:** Event subscription and coordination

```
┌──────────────────────────────────────────┐
│      EventListenerManager                │
├──────────────────────────────────────────┤
│  + setupEventListeners()                 │
│  + syncConversation(data)                │
│  + removeEventListeners()                │
├──────────────────────────────────────────┤
│  Listens To:                             │
│  • EVENTS.API_REQUEST                    │
│  • EVENTS.API_PROCESS_QUEUE              │
│  • EVENTS.STREAM_COMPLETE (if autoSync)  │
└──────────────────────────────────────────┘
```

**Event Subscriptions:**
```
EVENTS.API_REQUEST
    ↓
APIClient.enqueueRequest()

EVENTS.API_PROCESS_QUEUE
    ↓
APIClient.processQueue()

EVENTS.STREAM_COMPLETE (if autoSync)
    ↓
EventListenerManager.syncConversation()
    ↓
APIClient.enqueueRequest({ POST /api/conversations })
```

## Services Layer

### 1. RequestQueue

**Purpose:** FIFO queue with concurrency control

```
┌──────────────────────────────────────────┐
│         RequestQueue                     │
├──────────────────────────────────────────┤
│  + enqueue(request)                      │
│  + enqueuePriority(request)              │
│  + dequeue()                             │
│  + markActive(id, request)               │
│  + markComplete(id)                      │
│  + getStats()                            │
├──────────────────────────────────────────┤
│  State:                                  │
│  • queue: Array (pending requests)       │
│  • active: Map (in-flight requests)      │
│  • maxConcurrent: Number                 │
└──────────────────────────────────────────┘
```

### 2. CircuitBreaker

**Purpose:** Fault tolerance via circuit breaker pattern

```
┌──────────────────────────────────────────┐
│         CircuitBreaker                   │
├──────────────────────────────────────────┤
│  + recordSuccess()                       │
│  + recordFailure()                       │
│  + isRequestAllowed()                    │
│  + getState()                            │
├──────────────────────────────────────────┤
│  States:                                 │
│  • CLOSED (normal operation)             │
│  • OPEN (blocking requests)              │
│  • HALF_OPEN (testing recovery)          │
└──────────────────────────────────────────┘
```

**State Transitions:**
```
CLOSED
  │
  │ failures >= threshold
  ↓
OPEN
  │
  │ timeout expires
  ↓
HALF_OPEN
  │
  ├─ success → CLOSED
  └─ failure → OPEN
```

### 3. RetryPolicy

**Purpose:** Exponential backoff retry logic

```
┌──────────────────────────────────────────┐
│         RetryPolicy                      │
├──────────────────────────────────────────┤
│  + shouldRetry(attempts)                 │
│  + calculateDelay(attempt)               │
│  + getRetryInfo(attempts)                │
├──────────────────────────────────────────┤
│  Config:                                 │
│  • maxAttempts: 3                        │
│  • baseDelay: 1000ms                     │
│  • maxDelay: 30000ms                     │
│  • jitterEnabled: true                   │
└──────────────────────────────────────────┘
```

**Delay Calculation:**
```
delay = baseDelay * 2^(attempt-1) + jitter
capped at maxDelay

Example:
Attempt 1: 1000ms + jitter
Attempt 2: 2000ms + jitter
Attempt 3: 4000ms + jitter
```

### 4. RequestExecutor

**Purpose:** Pure HTTP execution with timeout

```
┌──────────────────────────────────────────┐
│         RequestExecutor                  │
├──────────────────────────────────────────┤
│  + execute(request)                      │
│  + buildURL(endpoint)                    │
│  + buildOptions(method, data, headers)   │
│  + handleResponse(response)              │
│  + handleError(error)                    │
├──────────────────────────────────────────┤
│  Config:                                 │
│  • baseURL                               │
│  • timeout                               │
│  • defaultHeaders                        │
└──────────────────────────────────────────┘
```

## Complete Request Flow

```
┌────────────────────────────────────────────────────────────────┐
│                    Full Request Lifecycle                       │
└────────────────────────────────────────────────────────────────┘

1. External Trigger
   EVENTS.API_REQUEST or user call
        ↓
2. APIClient.enqueueRequest()
        ↓
3. RequestStateManager.createQueuedRequest()
   • Generate ID
   • Add metadata (status: PENDING, attempts: 0)
        ↓
4. RequestQueue.enqueue()
   • Add to queue array
        ↓
5. Emit: EVENTS.API_REQUEST_QUEUED
        ↓
6. APIClient.processQueue()
   • Check circuit breaker
   • Dequeue if under concurrency limit
        ↓
7. RequestLifecycleHandler.executeRequest()
   • Update status: IN_FLIGHT
   • Mark active in queue
   • Emit: API_REQUEST_START
        ↓
8. RequestExecutor.execute()
   • Build URL and options
   • Fetch with timeout
        ↓
9. Response Handling

   ┌─────────────┐
   │  Success?   │
   └─────────────┘
        │
   ┌────┴────┐
   │         │
  YES       NO
   │         │
   ↓         ↓

SUCCESS PATH                    FAILURE PATH
   │                                │
   ↓                                ↓
handleSuccess()              handleFailure()
   │                                │
   ├─ Update status: SUCCESS        ├─ Check RetryPolicy.shouldRetry()
   ├─ Mark complete in queue        │
   ├─ Store in history             ┌┴──────────┐
   ├─ Emit: API_REQUEST_SUCCESS    │           │
   └─ CircuitBreaker.recordSuccess YES        NO
                                    │           │
                                    ↓           ↓
                            scheduleRetry()  handleFinalFailure()
                                    │           │
                            ├─ Status: RETRY   ├─ Status: FAILED
                            ├─ Calculate delay ├─ Store in history
                            ├─ Emit: RETRY     ├─ Emit: FAILED
                            └─ setTimeout()    └─ CircuitBreaker.recordFailure()
                                    │                   │
                                    ↓                   ↓
                            Re-enqueue priority  Check if circuit opened
                            Back to step 6              │
                                                       ↓
                                                Emit: API_CIRCUIT_OPEN
```

## Event-Driven Communication

### Published Events

```
APIClient emits:
├─ API_REQUEST_QUEUED      { requestId, request }
├─ API_REQUEST_START       { requestId, request }
├─ API_REQUEST_SUCCESS     { requestId, request, response }
├─ API_REQUEST_FAILED      { requestId, request, error }
├─ API_REQUEST_RETRY       { requestId, request, error, nextAttempt, delay }
└─ API_CIRCUIT_OPEN        { failures, threshold }
```

### Subscribed Events

```
APIClient listens to:
├─ API_REQUEST             → enqueueRequest()
├─ API_PROCESS_QUEUE       → processQueue()
└─ STREAM_COMPLETE         → syncConversation() (if autoSync)
```

## Dependency Graph

```
┌──────────────┐
│  index.js    │
│  (APIClient) │
└──────────────┘
       │
       ├─────────────────────────┐
       │                         │
       ↓                         ↓
┌──────────────────┐    ┌──────────────────┐
│ Configuration    │    │  EventListener   │
│   Manager        │    │    Manager       │
└──────────────────┘    └──────────────────┘
       │                         │
       │ Creates                 │ Subscribes to
       ↓                         ↓
┌─────────────────────────────────────────┐
│           Services Layer                 │
├─────────────────────────────────────────┤
│ • RequestQueue                           │
│ • CircuitBreaker                         │
│ • RetryPolicy                            │
│ • RequestExecutor                        │
└─────────────────────────────────────────┘
       ↑                         ↑
       │                         │
       └─────────┬───────────────┘
                 │
                 │ Uses
                 ↓
    ┌────────────────────────┐
    │ RequestLifecycle       │
    │    Handler             │
    └────────────────────────┘
                 │
                 │ Uses
                 ↓
    ┌────────────────────────┐
    │  RequestState          │
    │    Manager             │
    └────────────────────────┘
```

## File Responsibilities

| File | Lines | Purpose | Dependencies |
|------|-------|---------|--------------|
| **index.js** | 147 | Main orchestrator | All core modules |
| **core/ConfigurationManager.js** | 113 | Config & service init | Services layer |
| **core/RequestStateManager.js** | 100 | State tracking | RequestQueue |
| **core/RequestLifecycleHandler.js** | 156 | Request execution flow | All services + StateManager |
| **core/EventListenerManager.js** | 67 | Event subscriptions | eventBus, APIClient |
| **types/constants.js** | 14 | Type definitions | None |
| **services/RequestQueue.js** | 141 | Queue management | None |
| **services/CircuitBreaker.js** | 198 | Fault tolerance | None |
| **services/RetryPolicy.js** | 129 | Retry logic | None |
| **services/RequestExecutor.js** | 182 | HTTP execution | None |

## Key Design Patterns

1. **Dependency Injection** - Services injected into handlers
2. **Observer Pattern** - Event-based communication via eventBus
3. **Strategy Pattern** - RetryPolicy with different strategies
4. **State Pattern** - CircuitBreaker state machine
5. **Facade Pattern** - index.js provides simple API to complex system
6. **Composition Pattern** - APIClient composes smaller modules

## Performance Characteristics

- **Queue Processing:** O(1) enqueue/dequeue
- **Request Lookup:** O(1) via Map
- **Circuit Breaker:** O(1) state checks
- **Retry Calculation:** O(1) delay calculation
- **Memory:** Bounded by requestHistory (can add TTL cleanup)

## Extension Points

1. **Add Request Caching** → New module in core/
2. **Add Rate Limiting** → Extend RequestQueue or new service
3. **Add Request Prioritization** → Enhance RequestQueue
4. **Add Metrics Collection** → Extend RequestStateManager
5. **Add Custom Retry Strategies** → Extend RetryPolicy
6. **Add Request Interceptors** → Extend RequestExecutor
