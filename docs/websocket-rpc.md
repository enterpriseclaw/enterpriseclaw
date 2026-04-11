# WebSocket RPC Protocol

The server exposes a WebSocket endpoint at `/ws` for JSON-RPC 2.0 communication. This is the primary protocol used by the CLI and any programmatic integrations.

## Connection

```
ws://localhost:8080/ws
```

The server logs connection and disconnection events. No authentication is required in solo mode.

## Request Format

```json
{
  "jsonrpc": "2.0",
  "method": "method.name",
  "params": { "key": "value" },
  "id": "unique-request-id"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `jsonrpc` | string | Yes | Always `"2.0"` |
| `method` | string | Yes | RPC method name |
| `params` | object | No | Method-specific parameters (defaults to `{}`) |
| `id` | string | Yes | Client-generated unique ID for correlating responses |

## Response Format

**Success:**

```json
{
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "result": { ... },
  "error": null
}
```

**Error:**

```json
{
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "result": null,
  "error": {
    "code": -32601,
    "message": "Method not found: foo.bar"
  }
}
```

### Standard Error Codes

| Code | Meaning |
|------|---------|
| `-32700` | Parse error -- invalid JSON |
| `-32601` | Method not found |
| `-32602` | Invalid params |
| `-32603` | Internal error |

## Streaming (chat.send)

The `chat.send` method streams responses as notification frames. After sending the request, the server sends multiple notification frames followed by a final response frame.

**Notification frame (no `id`, not a response):**

```json
{
  "jsonrpc": "2.0",
  "method": "chat.event",
  "params": {
    "token": "Hello "
  }
}
```

**Final response (has `id`, signals completion):**

```json
{
  "jsonrpc": "2.0",
  "id": "original-request-id",
  "result": { "status": "done" },
  "error": null
}
```

Clients should accumulate `token` values from notification frames and display them incrementally.

## Methods Reference

### health

Check server status.

**Params:** none

**Result:**

```json
{
  "status": "UP",
  "version": "0.0.1-SNAPSHOT"
}
```

### session.list

List all chat sessions.

**Params:** none

**Result:**

```json
{
  "sessions": [
    {
      "id": "uuid",
      "title": "Session title",
      "createdAt": "2026-04-11T10:00:00Z",
      "status": "ACTIVE"
    }
  ]
}
```

### session.create

Create a new chat session.

**Params:** none

**Result:**

```json
{
  "sessionId": "uuid",
  "title": null,
  "createdAt": "2026-04-11T10:00:00Z",
  "status": "ACTIVE"
}
```

### session.delete

Delete a chat session.

**Params:**

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `sessionId` | string | Yes | Session ID to delete |

**Result:**

```json
{
  "deleted": true
}
```

### session.messages

Get messages for a session.

**Params:**

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `sessionId` | string | Yes | Session ID |
| `limit` | integer | No | Max messages (default 50) |
| `offset` | integer | No | Pagination offset (default 0) |

**Result:**

```json
{
  "messages": [
    {
      "id": "uuid",
      "role": "USER",
      "content": "Hello",
      "createdAt": "2026-04-11T10:00:00Z"
    },
    {
      "id": "uuid",
      "role": "ASSISTANT",
      "content": "Hi there!",
      "createdAt": "2026-04-11T10:00:01Z"
    }
  ]
}
```

### chat.send

Send a message and stream the response.

**Params:**

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `sessionId` | string | Yes | Session to send in |
| `message` | string | Yes | User message text |
| `model` | string | No | Model ID (e.g., `copilot:gpt-4.1`) |

**Streaming notifications:**

```json
{"jsonrpc": "2.0", "method": "chat.event", "params": {"token": "Hello "}}
{"jsonrpc": "2.0", "method": "chat.event", "params": {"token": "world!"}}
```

**Final result:**

```json
{
  "jsonrpc": "2.0",
  "id": "req-1",
  "result": {"status": "done"},
  "error": null
}
```

### skills.list

List loaded skills.

**Params:** none

**Result:**

```json
{
  "skills": [
    {
      "name": "github",
      "description": "GitHub operations via gh CLI...",
      "toolCount": 3
    }
  ]
}
```

### skills.detail

Get full details of a specific skill.

**Params:**

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `name` | string | Yes | Skill name |

**Result:**

```json
{
  "name": "github",
  "description": "GitHub operations via gh CLI...",
  "markdownBody": "# GitHub Skill\n...",
  "tools": [
    {
      "name": "searchIssues",
      "description": "Search GitHub issues and pull requests",
      "parameters": { "query": { "type": "string" } }
    }
  ],
  "provider": "github"
}
```

### skills.rescan

Rescan the skills directory and reload all skills.

**Params:** none

**Result:**

```json
{
  "count": 2
}
```

### models.list

List available LLM models.

**Params:** none

**Result:**

```json
{
  "models": [
    {
      "id": "gpt-4.1",
      "displayName": "GPT-4.1",
      "provider": "openai",
      "available": true
    },
    {
      "id": "copilot:gpt-4.1",
      "displayName": "Copilot GPT-4.1",
      "provider": "copilot",
      "available": true
    }
  ]
}
```

### channels.list

List configured channel connectors.

**Params:** none

**Result:**

```json
{
  "channels": [
    {
      "id": "uuid",
      "name": "My Teams Bot",
      "channelType": "TEAMS",
      "enabled": true,
      "connected": true
    }
  ]
}
```

### channels.status

Get status of a specific channel.

**Params:**

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `channelId` | string | Yes | Channel config ID |

**Result:**

```json
{
  "id": "uuid",
  "name": "My Teams Bot",
  "channelType": "TEAMS",
  "enabled": true,
  "connected": true
}
```

## Implementation Notes

The WebSocket handler (`JsonRpcWebSocketHandler`) is a Spring `TextWebSocketHandler`. It auto-discovers all `RpcMethod` beans at startup and builds a method name to handler map.

Each RPC method is a Spring `@Component` implementing `RpcMethod`:

```java
public interface RpcMethod {
    String methodName();
    Object execute(Map<String, Object> params, WebSocketSession session) throws Exception;
}
```

Method implementations are in `com.enterpriseclaw.websocket.methods` and `com.enterpriseclaw.websocket.rpc`.

WebSocket configuration is in `WebSocketConfig`, which registers the handler at the `/ws` path.
