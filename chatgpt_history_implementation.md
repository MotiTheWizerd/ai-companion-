# ChatGPT Conversation History Import - Implementation Summary

## Overview
Extended the `ChatHistoryManager` to support ChatGPT conversation history import, matching the existing Claude implementation.

## Changes Made

### 1. URL Detection (ChatHistoryManager.js)
**Location**: `monitorUrlChanges()` method

Added ChatGPT URL pattern detection:
```javascript
const chatgptPageMatch = currentUrl.match(/chatgpt\.com\/c\/([a-f0-9-]+)/i);
if (chatgptPageMatch) {
  const conversationId = chatgptPageMatch[1];
  console.log(`[ChatHistoryManager] Detected ChatGPT conversation page visit: ${conversationId}`);
  this.handleChatGPTConversationVisit(conversationId);
}
```

### 2. API Interception (ChatHistoryManager.js)
**Location**: `setupNetworkInterceptor()` method

Added interception for ChatGPT conversation API:
```javascript
if (typeof url === 'string' && url.includes('chatgpt.com/backend-api/conversation/')) {
  console.log(`[ChatHistoryManager] Intercepting ChatGPT API request: ${url}`);
  // ... intercept and capture response
  self.captureChatGPTConversationData(data, url);
}
```

### 3. New Methods Added

#### `handleChatGPTConversationVisit(conversationId)`
- Handles when a user visits a ChatGPT conversation URL
- Resets capture flag for new conversations
- Waits for API call to retrieve conversation data

#### `captureChatGPTConversationData(data, url)`
- Processes raw ChatGPT API response
- Extracts conversation ID and model name
- Calls `extractChatGPTMessages()` to parse messages
- Creates and stores entry in the same format as Claude

#### `extractChatGPTMessages(mapping)`
- Parses ChatGPT's unique `mapping` structure
- Recursively traverses the conversation tree
- Filters for `user` and `assistant` roles only (skips `system`)
- Extracts text from `content.parts` array
- Returns array of `{role, text, message_id}` objects

## ChatGPT Data Structure

### API Endpoint
```
GET https://chatgpt.com/backend-api/conversation/{conversation-id}
```

### Response Structure
```javascript
{
  "conversation_id": "692af3af-b93c-8330-bc95-df2a28d69c3f",
  "default_model_slug": "gpt-5-1-instant",
  "mapping": {
    "client-created-root": { ... },
    "message-id-1": {
      "id": "message-id-1",
      "message": {
        "id": "message-id-1",
        "author": { "role": "user" },
        "content": {
          "content_type": "text",
          "parts": ["Hello there"]
        }
      },
      "children": ["message-id-2"]
    },
    "message-id-2": {
      "id": "message-id-2",
      "message": {
        "id": "message-id-2",
        "author": { "role": "assistant" },
        "content": {
          "content_type": "text",
          "parts": ["Hey Moti."]
        }
      },
      "children": []
    }
  }
}
```

### Extracted Format
```javascript
{
  user_id: "user-id",
  project_id: "eb75e102-be0a-4b4b-a7ce-59fcab03fc0d",
  model: "gpt-5-1-instant",
  session_id: "692af3af-b93c-8330-bc95-df2a28d69c3f",
  conversation_id: "692af3af-b93c-8330-bc95-df2a28d69c3f",
  conversation_messages: [
    {
      role: "user",
      text: "Hello there",
      message_id: "message-id-1"
    },
    {
      role: "assistant",
      text: "Hey Moti.",
      message_id: "message-id-2"
    }
  ]
}
```

## How It Works

1. **User visits ChatGPT conversation**: `https://chatgpt.com/c/{conversation-id}`
2. **URL Monitor detects**: Pattern match triggers `handleChatGPTConversationVisit()`
3. **Browser fetches conversation**: ChatGPT makes API call to `/backend-api/conversation/{id}`
4. **Network Interceptor captures**: Response is cloned and parsed
5. **Data extraction**: `extractChatGPTMessages()` parses the mapping structure
6. **Storage**: Entry is created and stored in memory
7. **Backend sync**: `ChatImportManager` sends to backend via `/conversations/raw-import`

## Testing

To test the implementation:

1. **Load the extension** in Chrome
2. **Visit a ChatGPT conversation**: `https://chatgpt.com/c/{any-conversation-id}`
3. **Check console logs** for:
   - `[ChatHistoryManager] Detected ChatGPT conversation page visit`
   - `[ChatHistoryManager] Intercepting ChatGPT API request`
   - `[ChatHistoryManager] Extracted X messages from ChatGPT conversation`
   - `[ChatHistoryManager] ChatGPT conversation data captured`
4. **Trigger import**: Use the import button/event to send to backend
5. **Verify backend payload**: Check that the data matches the expected format

## Compatibility

- ✅ Works alongside existing Claude implementation
- ✅ Uses same data format for backend API
- ✅ Reuses `ChatImportManager` without modifications
- ✅ Filters out system messages (only user/assistant)
- ✅ Handles ChatGPT's tree-based message structure
