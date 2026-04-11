# Channels

Channels connect external messaging platforms to EnterpriseClaw's gateway pipeline. Each channel receives messages, normalizes them into an `IncomingChannelRequest`, routes them through the gateway (identity, policy, agent execution, audit), and sends the reply back.

## Architecture

```
External Platform
  -> Webhook endpoint (HTTP POST)
  -> ChannelConnector.start()
  -> IncomingChannelRequest (normalized)
  -> EnterpriseGatewayService.execute()
  -> ExecutionResult
  -> ChannelConnector.sendReply()
  -> External Platform
```

### Core Interface

Every channel implements `ChannelConnector`:

```java
public interface ChannelConnector {
    ChannelType channelType();     // TEAMS, TELEGRAM, API, etc.
    void start(ChannelConfig config);
    void stop();
    boolean isConnected();
    void sendReply(String channelThreadId, String message);
    String displayName();
}
```

### Channel Types

The `ChannelType` enum defines all possible channels:

```
WEB, SLACK, TEAMS, CLI, API, TELEGRAM, DISCORD
```

Implemented connectors: **TEAMS**, **TELEGRAM**, **API** (generic webhook).

### IncomingChannelRequest

All channel messages are normalized to this shape before entering the gateway:

```java
public record IncomingChannelRequest(
    String requestId,
    ChannelType channel,
    String channelUserId,
    String channelThreadId,
    String message,
    String tenantId,
    Instant receivedAt,
    Map<String, String> metadata
) {}
```

## Available Channels

### Microsoft Teams

Connects via Azure Bot Framework. Receives activities at a webhook endpoint, processes them through the gateway, and replies to the Teams conversation.

**Config JSON:**

```json
{
  "appId": "your-azure-bot-app-id",
  "appPassword": "your-azure-bot-app-password"
}
```

**Components:**

- `TeamsChannelConnector` -- starts/stops the connection, sends replies via Bot Framework REST API
- `TeamsAuthProvider` -- obtains OAuth tokens from Azure AD for the bot
- `TeamsWebhookController` -- receives incoming activities at `/api/v1/webhook/teams`

### Telegram

Connects via Telegram Bot API with webhook registration. When started, it calls `setWebhook` to register the EnterpriseClaw endpoint with Telegram.

**Config JSON:**

```json
{
  "botToken": "123456:ABC-DEF...",
  "webhookUrl": "https://your-domain.com/api/v1/webhook/telegram"
}
```

**Components:**

- `TelegramChannelConnector` -- registers/deregisters webhook, sends replies via `sendMessage`
- `TelegramApiClient` -- HTTP client for Telegram Bot API calls
- `TelegramWebhookController` -- receives updates at `/api/v1/webhook/telegram`

### Generic Webhook (API)

A simple HTTP webhook for custom integrations. Accepts POST requests with a message and routes them through the gateway.

**Endpoint:**

```
POST /api/v1/webhook/inbound
```

**Request:**

```json
{
  "message": "Hello, agent",
  "threadId": "optional-thread-id",
  "userId": "optional-user-id",
  "metadata": {
    "model": "gpt-4.1"
  }
}
```

**Headers:**

```
X-API-Key: your-configured-api-key
```

**Response:**

```json
{
  "requestId": "uuid",
  "response": "Agent reply text",
  "success": true,
  "errorMessage": null,
  "toolsInvoked": ["searchIssues"],
  "skillsActivated": [],
  "latencyMs": 1234,
  "completedAt": "2026-04-11T10:00:00Z"
}
```

If no API key is configured on the channel, the `X-API-Key` header is not required. If one is configured and the header does not match, the endpoint returns `401`.

## Setting Up MS Teams

1. Register a bot in the [Azure Portal](https://portal.azure.com) under Azure Bot Services.
2. Note the **App ID** and **App Password**.
3. Set the messaging endpoint to `https://your-domain.com/api/v1/webhook/teams`.
4. Create a channel config:

```bash
curl -X POST http://localhost:8080/api/v1/channels \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Teams Bot",
    "channelType": "TEAMS",
    "configJson": "{\"appId\":\"...\",\"appPassword\":\"...\"}"
  }'
```

5. Enable the channel:

```bash
curl -X POST http://localhost:8080/api/v1/channels/{id}/enable
```

## Setting Up Telegram

1. Message [@BotFather](https://t.me/BotFather) on Telegram to create a bot.
2. Copy the bot token.
3. Create a channel config:

```bash
curl -X POST http://localhost:8080/api/v1/channels \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Telegram Bot",
    "channelType": "TELEGRAM",
    "configJson": "{\"botToken\":\"123456:ABC-DEF...\",\"webhookUrl\":\"https://your-domain.com/api/v1/webhook/telegram\"}"
  }'
```

4. Enable the channel (this registers the webhook with Telegram):

```bash
curl -X POST http://localhost:8080/api/v1/channels/{id}/enable
```

## Setting Up Generic Webhook

1. Create a channel config:

```bash
curl -X POST http://localhost:8080/api/v1/channels \
  -H "Content-Type: application/json" \
  -d '{
    "name": "API Integration",
    "channelType": "API",
    "configJson": "{\"apiKey\":\"my-secret-key\"}"
  }'
```

2. Enable the channel:

```bash
curl -X POST http://localhost:8080/api/v1/channels/{id}/enable
```

3. Send messages:

```bash
curl -X POST http://localhost:8080/api/v1/webhook/inbound \
  -H "Content-Type: application/json" \
  -H "X-API-Key: my-secret-key" \
  -d '{"message": "Hello from my integration"}'
```

## Channel Management API

All endpoints are under `/api/v1/channels`.

### List Channels

```
GET /api/v1/channels
```

Response:

```json
[
  {
    "id": "uuid",
    "name": "My Teams Bot",
    "channelType": "TEAMS",
    "enabled": true,
    "connected": true
  }
]
```

### Create Channel

```
POST /api/v1/channels
Content-Type: application/json

{
  "name": "Channel Name",
  "channelType": "TEAMS",
  "configJson": "{...}"
}
```

Channels are created in a disabled state. Call `/{id}/enable` to start them.

### Get Channel

```
GET /api/v1/channels/{id}
```

### Update Channel

```
PUT /api/v1/channels/{id}
Content-Type: application/json

{
  "name": "Updated Name",
  "configJson": "{...}"
}
```

### Delete Channel

```
DELETE /api/v1/channels/{id}
```

Stops the channel connector and removes the config.

### Enable / Disable

```
POST /api/v1/channels/{id}/enable
POST /api/v1/channels/{id}/disable
```

### Get Channel Status

```
GET /api/v1/channels/{id}/status
```

Response:

```json
{
  "id": "uuid",
  "name": "My Teams Bot",
  "channelType": "TEAMS",
  "enabled": true,
  "connected": true
}
```

## Adding a New Channel

1. Add a value to the `ChannelType` enum if needed.
2. Create a new package under `com.enterpriseclaw.channel.myplatform`.
3. Implement `ChannelConnector`:
   - `channelType()` -- return your enum value
   - `start(ChannelConfig)` -- parse `configJson`, initialize connection
   - `stop()` -- tear down connection
   - `sendReply(threadId, message)` -- send response back to platform
4. Add `@Component` to auto-register with `ChannelManager`.
5. Create a webhook controller if the platform pushes messages via HTTP (e.g., `@RestController @RequestMapping("/api/v1/webhook/myplatform")`).
6. In the webhook controller, build an `IncomingChannelRequest` and call `EnterpriseGatewayService.execute()`.

## Exposing Webhooks to the Internet

For local development, external platforms need to reach your webhook URLs. Options:

- **ngrok:** `ngrok http 8080` -- gives you a public URL
- **Cloudflare Tunnel:** `cloudflared tunnel --url http://localhost:8080`
- **Production:** Deploy behind a reverse proxy with a real domain and TLS

See [Deployment](deployment.md) for production setup.
