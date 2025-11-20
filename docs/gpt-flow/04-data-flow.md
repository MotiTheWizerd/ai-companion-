# Data Flow

## Overview

This document traces the complete journey of data through the system, from user input to backend synchronization. Understanding this flow is crucial for debugging and extending the extension.

## Complete User Message Flow

```
User Types Message on ChatGPT
    ↓
User Clicks Send
    ↓
ChatGPT Frontend Calls fetch()
    ↓
[INTERCEPTION POINT]
FetchHandler Intercepts Request
    ↓
Provider Modifies Request (Memory Injection)
    ↓
Modified Request Sent to ChatGPT API
    ↓
ChatGPT Processes Request with Memory Context
    ↓
ChatGPT Returns Streaming Response
    ↓
[INTERCEPTION POINT]
Response Stream Intercepted
    ↓
Chunks Processed in Real-Time
    ↓
Events Emitted to EventBus
    ↓
Handlers Update State
    ↓
Conversation Saved to localStorage
    ↓
Sync Triggered to Backend API
    ↓
Backend Stores Conversation
```

## Detailed Flow Breakdown

### Phase 1: Request Interception

**Location**: [FetchHandler.js](../src/modules/NetworkInterceptor/FetchHandler.js)

**Trigger**: User submits message on AI chat interface

**Steps**:

1. **Native fetch is called** by AI provider frontend
   ```javascript
   fetch('https://chatgpt.com/backend-api/conversation', {
     method: 'POST',
     body: JSON.stringify({
       messages: [{ content: { parts: ['User message'] } }]
     })
   })
   ```

2. **Interceptor captures the call**
   ```javascript
   const originalFetch = window.fetch;
   window.fetch = async function(...args) {
     const [url, options] = args;

     // Get active provider
     const provider = ProviderRegistry.getInstance().getActiveProvider();
     if (!provider) {
       return originalFetch.apply(this, args);
     }

     // Check if this is a conversation endpoint
     const urlMatcher = provider.getURLMatcher();
     if (!urlMatcher.isConversationEndpoint(url)) {
       return originalFetch.apply(this, args);
     }

     // Extract conversation ID from URL
     const conversationId = extractConversationId(url);

     // Parse request body
     let requestBody = null;
     if (options?.body) {
       requestBody = JSON.parse(options.body);
     }

     // ... continue to Phase 2
   }
   ```

### Phase 2: Request Modification

**Location**: [ChatGPTProvider.js:handleRequest](../src/modules/providers/chatgpt/ChatGPTProvider.js)

**Note**: Only ChatGPT implements this feature

**Steps**:

1. **Extract user message** from request body
   ```javascript
   const userText = requestBody.messages?.[0]?.content?.parts?.[0];
   ```

2. **Fetch relevant memories** via background bridge
   ```javascript
   const memoryData = await provider.handleRequest(requestBody);
   // Behind the scenes:
   // Page → postMessage → Content Script → chrome.runtime.sendMessage
   // → Background → HTTP POST /conversations/fetch-memory
   // → Backend returns synthesized_memory
   // → Response flows back through bridge
   ```

3. **Prepend memory block** to user message
   ```javascript
   const memoryBlock = `[semantix-memory-block]\n${synthesizedMemory}\n[semantix-end-memory-block]\n\n`;
   const modifiedText = memoryBlock + userText;
   requestBody.messages[0].content.parts[0] = modifiedText;
   ```

4. **Execute modified fetch**
   ```javascript
   const response = await originalFetch(url, {
     ...options,
     body: JSON.stringify(requestBody)
   });
   ```

### Phase 3: Response Stream Interception

**Location**: [FetchHandler.js:handleConversationStream](../src/modules/NetworkInterceptor/FetchHandler.js)

**Steps**:

1. **Tap into response stream** without blocking it
   ```javascript
   const reader = response.body.getReader();
   const decoder = new TextDecoder();

   const tappedStream = new ReadableStream({
     async start(controller) {
       // Emit user message event
       if (userPrompt) {
         eventBus.emit('message:input', {
           text: userPrompt,
           conversationId,
           role: 'user'
         });
       }

       // Read and process chunks
       while (true) {
         const { done, value } = await reader.read();

         if (done) {
           controller.close();
           break;
         }

         // Decode chunk
         const chunk = decoder.decode(value, { stream: true });

         // Process chunk (extract events)
         chunkProcessor.processChunk(chunk, provider);

         // Pass through to original consumer
         controller.enqueue(value);
       }
     }
   });

   // Return tapped response
   return new Response(tappedStream, {
     headers: response.headers,
     status: response.status,
     statusText: response.statusText
   });
   ```

2. **Original ChatGPT UI receives unmodified stream**
   - The stream is tapped, not replaced
   - ChatGPT displays the response normally
   - Extension processes in parallel

### Phase 4: Chunk Processing

**Location**: [ChunkProcessor.js](../src/modules/NetworkInterceptor/ChunkProcessor.js)

**Steps**:

1. **Split chunk into lines**
   ```javascript
   const lines = chunk.split('\n').filter(line => line.trim());
   ```

2. **Parse each line** with provider-specific parser
   ```javascript
   for (const line of lines) {
     const parser = provider.getStreamParser();
     const parsed = parser.parseChunk(line);

     if (parsed) {
       this.handleParsedData(parsed, parser);
     }
   }
   ```

3. **Extract different data types**
   ```javascript
   handleParsedData(parsed, parser) {
     // Check for stream completion
     if (parsed.type === 'done') {
       eventBus.emit('stream:done');
       return;
     }

     // Check for explicit completion marker
     const completion = parser.extractCompletion(parsed);
     if (completion) {
       eventBus.emit('stream:complete', completion);
       return;
     }

     // Extract message marker
     const marker = parser.extractMessageMarker(parsed);
     if (marker) {
       eventBus.emit('message:marker', marker);
     }

     // Extract metadata
     const metadata = parser.extractMetadata(parsed);
     if (metadata) {
       eventBus.emit('message:metadata', metadata);
     }

     // Extract user input message
     const inputMessage = parser.extractInputMessage(parsed);
     if (inputMessage) {
       eventBus.emit('message:input', inputMessage);
     }

     // Extract text (stream start or text chunk)
     const textData = parser.extractTextFromDelta(parsed);
     if (textData) {
       if (textData.type === 'stream_start') {
         eventBus.emit('stream:start', textData);
       } else if (textData.type === 'text_chunk') {
         eventBus.emit('stream:text', textData);
       }
     }
   }
   ```

### Phase 5: Event Handling

**Location**: Event handlers in [src/content/modules/eventHandlers/](../src/content/modules/eventHandlers/)

**Event Timeline Example** (ChatGPT):

```
1. message:input
   └── handleMessageInput()
       ├── conversationManager.setConversationId(conversationId)
       └── conversationManager.addUserMessage(messageId, text)

2. stream:start
   └── handleStreamStart()
       ├── messageManager.startMessage(conversationId, messageId)
       └── conversationManager.setConversationId(conversationId)

3. stream:text (multiple times)
   └── handleStreamText()
       └── messageManager.appendText(chunk)

4. message:metadata
   └── handleMessageMetadata()
       ├── conversationManager.setModel(model)
       └── Update conversation metadata

5. stream:complete
   └── handleStreamComplete()
       ├── message = messageManager.finalize()
       ├── conversationManager.addAssistantMessage(messageId, text)
       ├── fullConversation = conversationManager.getConversation()
       ├── storageManager.saveConversation(fullConversation)
       └── Trigger backend sync

6. stream:done
   └── Log completion
```

**Handler Implementations**:

```javascript
// handleMessageInput (messageHandlers.js)
export function handleMessageInput(data, { conversationManager }) {
  const { text, conversationId, messageId, role } = data;

  conversationManager.setConversationId(conversationId);
  conversationManager.addUserMessage(messageId || `user_${Date.now()}`, text);

  Logger.message('User message captured:', text.substring(0, 100));
}

// handleStreamStart (streamHandlers.js)
export function handleStreamStart(data, { messageManager, conversationManager }) {
  const { conversationId, messageId, model } = data;

  messageManager.startMessage(conversationId, messageId);
  conversationManager.setConversationId(conversationId);

  if (model) {
    conversationManager.setModel(model);
  }

  Logger.stream('Stream started:', { conversationId, messageId });
}

// handleStreamText (streamHandlers.js)
export function handleStreamText(data, { messageManager }) {
  const { text } = data;
  messageManager.appendText(text);
}

// handleStreamComplete (streamHandlers.js)
export function handleStreamComplete(data, managers) {
  const { conversationManager, messageManager, storageManager } = managers;

  // Finalize message
  const message = messageManager.finalize();

  // Add to conversation
  conversationManager.addAssistantMessage(message.messageId, message.text);

  // Get full conversation
  const fullConversation = conversationManager.getConversation();

  // Save to localStorage
  storageManager.saveConversation(fullConversation);

  // Prepare sync data (last user + assistant messages only)
  const lastUserMsg = fullConversation.conversation
    .filter(m => m.role === 'user')
    .pop();
  const lastAssistantMsg = fullConversation.conversation
    .filter(m => m.role === 'assistant')
    .pop();

  // Trigger backend sync
  syncToBackend({
    conversation_id: fullConversation.conversation_id,
    session_id: fullConversation.conversation_id,
    model: fullConversation.model,
    project_id: getActiveProvider().config.projectId,
    conversation: [lastUserMsg, lastAssistantMsg].filter(Boolean)
  });

  Logger.stream('Stream complete, conversation saved and synced');
}
```

### Phase 6: State Management

**Managers**: [ConversationManager](../src/modules/ConversationManager/index.js), [MessageManager](../src/modules/MessageManager/index.js)

**ConversationManager State**:
```javascript
{
  conversation_id: 'conv_abc123',
  model: 'gpt-4',
  conversation: [
    {
      role: 'user',
      message_id: 'user_1234567890',
      text: 'What is machine learning?'
    },
    {
      role: 'assistant',
      message_id: 'msg_xyz789',
      text: 'Machine learning is a subset of artificial intelligence...'
    }
  ]
}
```

**MessageManager State** (temporary, during streaming):
```javascript
{
  text: 'Machine learning is a subset',  // Accumulating
  role: 'assistant',
  conversationId: 'conv_abc123',
  messageId: 'msg_xyz789'
}
```

### Phase 7: Persistence

**Location**: [StorageManager](../src/modules/StorageManager/index.js)

**localStorage Structure**:
```javascript
localStorage['chatgpt_conversations'] = JSON.stringify([
  {
    conversation_id: 'conv_1',
    model: 'gpt-4',
    conversation: [...]
  },
  {
    conversation_id: 'conv_2',
    model: 'gpt-4',
    conversation: [...]
  }
]);
```

**Save Operation**:
```javascript
saveConversation(conversation) {
  // Get existing conversations
  const conversations = this.getItem('chatgpt_conversations') || [];

  // Find existing conversation
  const index = conversations.findIndex(
    c => c.conversation_id === conversation.conversation_id
  );

  if (index !== -1) {
    // Update existing
    conversations[index] = conversation;
  } else {
    // Add new
    conversations.push(conversation);
  }

  // Save back
  this.setItem('chatgpt_conversations', conversations);
}
```

### Phase 8: Backend Synchronization

**Trigger**: After `STREAM_COMPLETE` event

**Communication Flow**:
```
Page Context
    ↓ window.postMessage
Content Script (loader.js)
    ↓ chrome.runtime.sendMessage
Background Script (background.js)
    ↓ HTTP POST
Backend API (localhost:8000/conversations)
```

**Sync Data Structure**:
```javascript
{
  user_id: '84e17260-ff03-409b-bf30-0b5ba52a2ab4',  // From userSettings.json
  project_id: '11',                                  // From provider config
  conversation_id: 'conv_abc123',
  session_id: 'conv_abc123',
  model: 'gpt-4',
  conversation: [
    {
      role: 'user',
      message_id: 'user_1234567890',
      text: 'What is machine learning?'
    },
    {
      role: 'assistant',
      message_id: 'msg_xyz789',
      text: 'Machine learning is a subset of artificial intelligence...'
    }
  ]
}
```

**Page Context Sync Initiation**:
```javascript
function syncToBackend(conversationData) {
  return new Promise((resolve, reject) => {
    const requestId = `sync_${Date.now()}`;

    // Listen for response
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

    // Send sync request
    window.postMessage({
      source: 'chatgpt-extension',
      type: 'SYNC_CONVERSATION',
      requestId,
      data: conversationData
    }, '*');
  });
}
```

**Content Script Bridge** ([loader.js](../src/content/loader.js)):
```javascript
window.addEventListener('message', async (event) => {
  if (event.data.source === 'chatgpt-extension' &&
      event.data.type === 'SYNC_CONVERSATION') {

    const response = await chrome.runtime.sendMessage({
      type: 'SYNC_CONVERSATION',
      data: event.data.data
    });

    window.postMessage({
      source: 'chatgpt-extension-response',
      requestId: event.data.requestId,
      ...response
    }, '*');
  }
});
```

**Background Handler** ([background.js](../src/background/background.js)):
```javascript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SYNC_CONVERSATION') {
    handleSyncConversation(message.data)
      .then(response => sendResponse(response))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;  // Keep channel open
  }
});

async function handleSyncConversation(data) {
  // Fix any JSON issues
  const fixedData = fixAndValidateJSON(data);

  // Add user_id from config
  const requestData = {
    ...fixedData,
    user_id: API_CONFIG.USER_ID
  };

  // Enqueue to API client
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
}
```

**API Client Execution** ([APIClient](../src/modules/APIClient/index.js)):
```javascript
// Request goes through:
enqueueRequest() → RequestQueue → CircuitBreaker → RetryPolicy → RequestExecutor
    ↓
HTTP POST http://localhost:8000/conversations
    ↓
Backend processes and stores
    ↓
Response returned through the chain
    ↓
Result available to background handler
```

## Data Transformation Points

### 1. User Input → Request Body

**Before**:
```
User types: "What is machine learning?"
```

**After** (ChatGPT with memory injection):
```javascript
{
  messages: [{
    content: {
      parts: [
        "[semantix-memory-block]\nPrevious context about ML...\n[semantix-end-memory-block]\n\nWhat is machine learning?"
      ]
    }
  }]
}
```

### 2. Stream Chunks → Events

**Raw Stream**:
```
data: {"o":"patch","v":[{"o":"append","v":"Machine"}]}
data: {"o":"patch","v":[{"o":"append","v":" learning"}]}
```

**Events**:
```javascript
eventBus.emit('stream:text', { text: 'Machine' });
eventBus.emit('stream:text', { text: ' learning' });
```

### 3. Events → State

**Events**:
```javascript
stream:text { text: 'Machine' }
stream:text { text: ' learning' }
```

**MessageManager State**:
```javascript
{ text: 'Machine learning', ... }
```

### 4. State → localStorage

**ConversationManager State**:
```javascript
{
  conversation_id: 'conv_123',
  conversation: [{ role: 'assistant', text: 'Machine learning is...' }]
}
```

**localStorage**:
```javascript
chatgpt_conversations: [{
  conversation_id: 'conv_123',
  conversation: [{ role: 'assistant', text: 'Machine learning is...' }]
}]
```

### 5. localStorage → Backend

**localStorage Format**:
```javascript
{
  conversation_id: 'conv_123',
  model: 'gpt-4',
  conversation: [...]
}
```

**Backend Format**:
```javascript
{
  user_id: '84e17260-ff03-409b-bf30-0b5ba52a2ab4',
  project_id: '11',
  conversation_id: 'conv_123',
  session_id: 'conv_123',
  model: 'gpt-4',
  conversation: [...]
}
```

## Error Handling Flow

### 1. Request Modification Failure

```javascript
try {
  modifiedBody = await provider.handleRequest(body);
} catch (error) {
  Logger.error('Request modification failed, using original body');
  modifiedBody = body;  // Fallback to original
}
```

### 2. Stream Processing Error

```javascript
try {
  chunkProcessor.processChunk(chunk, provider);
} catch (error) {
  Logger.error('Chunk processing failed:', error);
  // Continue processing next chunks
}
```

### 3. Backend Sync Failure

```javascript
try {
  await syncToBackend(conversationData);
  Logger.api('Sync successful');
} catch (error) {
  Logger.error('Sync failed:', error);
  // Conversation still saved in localStorage
  // Will retry on next stream complete
}
```

### 4. Circuit Breaker Opens

```
Multiple sync failures → Circuit opens → Stop sending requests
    ↓
Wait for timeout period
    ↓
Circuit half-opens → Try one request
    ↓
Success → Circuit closes
Failure → Circuit re-opens
```

## Performance Considerations

### 1. Non-Blocking Stream Processing

- Stream is tapped, not replaced
- Processing happens in parallel
- Original UI receives data immediately

### 2. Incremental State Updates

- Text chunks appended as they arrive
- No waiting for complete message

### 3. Debounced Syncs

- Only sync on `STREAM_COMPLETE`
- Not on every text chunk

### 4. Efficient Storage

- Only last user + assistant messages synced
- Full conversation in localStorage
- Backend receives minimal delta

## Debugging Data Flow

### Enable Verbose Logging

```javascript
// In constants.js, add:
export const DEBUG_MODE = true;

// In logger.js, use:
if (DEBUG_MODE) {
  console.log('[Debug]', ...args);
}
```

### Trace Events

```javascript
// Add event listener for all events
Object.values(EVENTS).forEach(event => {
  eventBus.on(event, (data) => {
    console.log(`[Event: ${event}]`, data);
  });
});
```

### Monitor State Changes

```javascript
// In managers, add:
addUserMessage(messageId, text) {
  console.log('[State Update] Add user message:', { messageId, text });
  this.conversation.conversation.push({ role: 'user', message_id: messageId, text });
}
```

## Related Documentation

- **Event System**: [05-event-system.md](05-event-system.md)
- **Network Interception**: [08-network-interception.md](08-network-interception.md)
- **Storage & State**: [07-storage-state.md](07-storage-state.md)
- **API Client**: [06-api-client.md](06-api-client.md)
