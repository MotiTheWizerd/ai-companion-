# ChatGPT API Wrapper with Memory Injection

Standalone API wrapper that intercepts and modifies ChatGPT API requests to inject memory context.

## Features

- ✅ Direct ChatGPT API access using your paid account
- ✅ Automatic memory injection via `system_hints` (invisible to user)
- ✅ Session management
- ✅ Isolated from browser extension

## Setup

```bash
cd chatgpt-api-wrapper
npm install
cp .env.example .env
# Add your OpenAI API key to .env
npm start
```

## Usage

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello!",
    "session_id": "optional-session-id",
    "user_id": "your-user-id"
  }'
```

## How It Works

1. Receives your message
2. Fetches relevant memory from your backend
3. Injects memory into `system_hints` (invisible)
4. Forwards modified request to OpenAI
5. Returns response
