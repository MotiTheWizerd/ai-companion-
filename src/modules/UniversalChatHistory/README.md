# UniversalChatHistory Module

The UniversalChatHistory module provides a unified system for capturing, storing, and managing chat history across different AI platforms (Claude, ChatGPT, Qwen, etc.). The module automatically detects when users resume conversations and captures the full chat history for storage and later retrieval.

## Features

- Platform-agnostic chat history capture
- Automatic detection of resumed conversations
- Persistent storage using localStorage
- Event-driven architecture for integration with existing systems
- Support for multiple AI providers through dedicated interfaces

## Data Structure

Each chat history entry contains the following fields:

- `id`: Unique identifier for the entry
- `created_at`: ISO timestamp when the entry was created
- `agent`: Information about the AI agent (name, provider, model)
- `user`: Information about the user (id, preferences)
- `messages`: Array of chat messages
- `conversation_id`: Identifier for the conversation
- `platform`: Platform where the chat occurred
- `raw_data`: Original API response data
- `url`: API URL where the data was retrieved from

## Components

### ChatHistoryManager
The main class that manages chat history entries with methods for:
- Creating new entries
- Retrieving entries by ID
- Updating existing entries
- Deleting entries
- Capturing chat history from resumed conversations
- Network interception to capture API responses

### EventIntegration
Connects the chat history module with the existing eventBus system and handles:
- Listening for conversation resume events
- Processing Claude API responses
- Emitting events when history is captured

### StorageManager
Handles data persistence using localStorage with error handling and usage information.

### Provider Interfaces
Specialized interfaces for different AI providers:
- ClaudeProviderInterface
- ChatGPTProviderInterface
- QwenProviderInterface

## Usage

### Basic Usage
```javascript
import { UniversalChatHistory } from './UniversalChatHistory';

const chatHistory = new UniversalChatHistory();
chatHistory.setupResumeChatObserver(); // Start monitoring for resumed conversations
```

### With Event System
```javascript
import { UniversalChatHistory, EventIntegration } from './UniversalChatHistory';

const chatHistory = new UniversalChatHistory();
const eventIntegration = new EventIntegration(chatHistory, eventBus);
chatHistory.setupResumeChatObserver();
```

### Manual Capture
```javascript
const entry = chatHistory.createEntry({
  agent: {
    name: 'Claude',
    provider: 'Anthropic',
    model: 'claude-3-opus'
  },
  user: {
    id: 'user123',
    preferences: {}
  },
  messages: [...],
  conversation_id: 'conv-abc123',
  platform: 'Claude'
});
```

## Claude Conversation Capture

The module automatically captures Claude conversations by:

1. Monitoring URL changes to detect Claude conversation URLs
2. Intercepting API requests to Claude's chat_conversations endpoints
3. Parsing the API response to extract conversation data
4. Storing the conversation in the unified format

Example Claude conversation URL detected:
`https://claude.ai/api/organizations/fdf7ed3c-5b3f-4b36-a49b-038565ee1165/chat_conversations/aad8947d-ceac-4010-8bcf-954204630f6b?tree=True&rendering_mode=messages&render_all_tools=true`

When such a URL is detected, the system intercepts the subsequent API call and stores the conversation data.