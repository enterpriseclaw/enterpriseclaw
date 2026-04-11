# Architecture

## High-Level Overview

```
                        +------------------+
                        |    Frontend      |
                        |  React 19 + Vite |
                        |  :5173           |
                        +--------+---------+
                                 |
                          /api proxy
                                 |
                        +--------+---------+
     +--- WebSocket --->|    Server        |<--- Webhook ---+
     |   (JSON-RPC)     | Spring Boot 4    |  (Teams/       |
     |                  | Spring AI 2      |   Telegram/     |
     |                  | :8080            |   Generic)      |
     |                  +--------+---------+                 |
     |                           |                           |
+----+----+            +---------+----------+        +-------+------+
|   CLI   |            |   LLM Providers    |        |   Channels   |
| Picocli |            | OpenAI | Anthropic |        | Teams        |
| JLink   |            | Ollama | Copilot   |        | Telegram     |
+---------+            | Codex              |        | Webhook      |
                       +--------------------+        +--------------+
```

## Three Independent Apps

Each app under `apps/` has its own build system, Taskfile, and Dockerfile. No shared classpaths or Gradle submodules.

| App | Stack | Port | Build |
|-----|-------|------|-------|
| `apps/server` | Spring Boot 4.0.0-RC2 + Spring AI 2.0.0-M4 (Java 21) | 8080 | Gradle |
| `apps/frontend` | React 19 + TypeScript + Vite + TailwindCSS 4 | 5173 | Bun |
| `apps/cli` | Plain Java 21 + Picocli + JLink | N/A | Gradle + JLink |

## Server Internals

### Package Structure

All packages are under `src/main/java/com/enterpriseclaw/`:

| Package | Purpose |
|---------|---------|
| `chat` | REST controller, ChatService, ChatClient config, NDJSON streaming, interactive question tool |
| `chat/provider` | Token providers for Copilot and Codex, ProviderModels registry |
| `chat/dto` | ChatRequest, ChatEvent, SessionSummary, MessageSummary, AnswerRequest |
| `websocket` | WebSocket JSON-RPC endpoint at `/ws`, method dispatcher |
| `websocket/methods` | Individual RPC method implementations (one class per method) |
| `websocket/rpc` | JsonRpcRequest, JsonRpcResponse, JsonRpcError, RpcMethod interface |
| `settings` | SettingsController -- models, providers, refresh, diagnostics |
| `gateway` | ExecutionPipeline interface, EnterpriseGatewayService orchestrator |
| `channel` | ChannelConnector interface, ChannelManager, ChannelsController, WebhookController |
| `channel/teams` | MS Teams connector, auth provider, webhook controller |
| `channel/telegram` | Telegram connector, API client, webhook controller |
| `skills` | SkillLoader (SKILL.md parser), SkillRegistry, SkillsController, built-in skills |
| `tenant` | Multi-tenancy via ThreadLocal TenantContext + servlet filter |
| `identity` | User identity resolution from channel requests |
| `policy` | Tool permission evaluation per user/channel |
| `audit` | Event logging and agent run tracking |
| `cronjobs` | Scheduled job entities and execution tracking |
| `model` | Shared DTOs: ChannelType, IncomingChannelRequest, ExecutionResult, etc. |
| `config` | Application-wide configuration beans |

### Gateway Pipeline

The `ExecutionPipeline` processes every incoming request through a fixed sequence:

```
Channel Input
  -> Context Extraction
  -> Identity Resolution (IdentityResolver)
  -> Policy Evaluation (PolicyEngine -> visible tools/skills)
  -> Agent Execution (ChatService -> LLM with tools)
  -> Response Formatting
  -> Audit Persist (AuditService)
```

The `EnterpriseGatewayService` implements this pipeline. It takes an `IncomingChannelRequest` (normalized from any channel) and produces an `ExecutionResult`.

```java
public interface ExecutionPipeline {
    ExecutionResult execute(IncomingChannelRequest request);
    ExecutionResult executeAuthorized(ExecutionRequest request);
}
```

### Dual Transport

The server exposes two transport mechanisms:

**REST + NDJSON (Browser)**

- `POST /api/v1/chat` streams newline-delimited JSON events via `ResponseBodyEmitter`
- Event types: `token`, `tool_call`, `tool_done`, `question`, `done`, `error`
- Used by the React frontend

**WebSocket JSON-RPC (CLI)**

- Endpoint: `ws://localhost:8080/ws`
- JSON-RPC 2.0 protocol with request/response and streaming notifications
- Used by the `ec` CLI tool
- See [WebSocket RPC](websocket-rpc.md) for the full protocol reference

## Provider System

Five providers are supported, all configured as Spring AI `ChatClient` beans sharing the same tool pipeline:

| Provider | ChatModel | Auth Mechanism | Detection |
|----------|-----------|----------------|-----------|
| OpenAI | `OpenAiChatModel` | API key in `.env` | `OPENAI_API_KEY` non-empty |
| Anthropic | `AnthropicChatModel` | API key in `.env` | `ANTHROPIC_API_KEY` non-empty |
| Ollama | `OllamaChatModel` | None | HTTP GET to `localhost:11434` returns 200 |
| Copilot | `OpenAiChatModel` with custom base URL | `gh auth token` | gh CLI returns a token |
| Codex | `OpenAiChatModel` with custom base URL | JWT from `~/.codex/auth.json` | auth.json exists and contains token |

Copilot and Codex reuse `OpenAiChatModel` because they implement the OpenAI-compatible chat completions API. The `ChatClientConfiguration` creates qualified beans for each provider.

Model IDs use prefixes to route to the correct provider: `copilot:gpt-4.1`, `codex:gpt-5.4`, `ollama:llama3.2`. Models without a prefix route to OpenAI. Models starting with `claude` route to Anthropic.

The `ModelRegistry` probes each provider on startup and exposes results via `GET /api/v1/settings/models`. The frontend fetches this list dynamically -- no hardcoded model names.

See [Providers](providers.md) for setup instructions.

## Skills System

Skills are defined as SKILL.md files with YAML frontmatter in the `skills/` directory at the repository root.

```
skills/
  github/
    SKILL.md
  knowledge/
    SKILL.md
```

The `SkillLoader` scans this directory on startup (`@PostConstruct`), parses YAML frontmatter to extract name, description, and tool definitions, then registers them in memory. Skills can also be managed via REST API (`/api/v1/skills`) and rescanned on demand.

Built-in skills (`GitHubSkill`, `KnowledgeSkill`, `IncidentSkill`) are registered as Spring AI `@Tool` beans via `MethodToolCallbackProvider`. Dynamic skills from SKILL.md files are loaded via the `SkillsTool` from spring-ai-agent-utils.

See [Skills](skills.md) for the full guide.

## Channel System

Channels deliver messages from external platforms into the gateway pipeline. The `ChannelConnector` interface defines the contract:

```java
public interface ChannelConnector {
    ChannelType channelType();
    void start(ChannelConfig config);
    void stop();
    boolean isConnected();
    void sendReply(String channelThreadId, String message);
    String displayName();
}
```

Available channel types: `WEB`, `SLACK`, `TEAMS`, `CLI`, `API`, `TELEGRAM`, `DISCORD`.

Implemented connectors:
- **TeamsChannelConnector** -- Azure Bot Framework integration
- **TelegramChannelConnector** -- Telegram Bot API with webhook registration
- **WebhookChannelConnector** -- Generic HTTP webhook with API key auth

Each channel has a `ChannelConfig` entity stored in the database with a JSON blob for provider-specific settings. The `ChannelManager` starts all enabled channels on application boot.

See [Channels](channels.md) for setup instructions.

## Database

### Solo Mode (Default)

- H2 embedded database, file-based at `./data/enterpriseclaw`
- No external dependencies
- Single user, no auth

### Team Mode

- PostgreSQL with pgvector extension (for future vector search)
- Docker Compose config: `docker-compose-postgres.yaml`
- Multi-tenant, authentication enabled

### Migrations

Flyway manages the schema. Migrations are in `apps/server/src/main/resources/db/migration/`:

| Migration | Table |
|-----------|-------|
| V1 | `chat_sessions` |
| V2 | `chat_messages` |
| V3 | `agent_run_log` |
| V4 | `audit_events` |
| V5 | `scheduled_jobs` |
| V6 | `job_executions` |
| V7 | `tenants` |
| V8 | `app_users` |
| V9 | `channel_identities` |
| V10 | `executions` |
| V11 | `mcp_servers` |
| V12 | `skills_registry` |
| V13 | `channel_configs` |

Hibernate runs with `ddl-auto: validate` -- Flyway owns the schema, Hibernate only validates it.

## Configuration

Configuration is layered across three files:

| File | Contents | Committed |
|------|----------|-----------|
| `.env` | Secrets (API keys) | No (`.gitignore`) |
| `application.env` | Non-secret runtime config | Yes |
| `apps/server/src/main/resources/application.yml` | Spring Boot defaults | Yes |

The root `Taskfile.yml` loads both `.env` and `application.env` via `dotenv`.

Key properties in `application.yml`:

```yaml
enterpriseclaw:
  skills:
    directory: ../../skills           # Path to skills folder
  chat:
    default-provider: auto            # auto | openai | anthropic | copilot | codex | ollama
    default-model: gpt-4.1
    copilot:
      enabled: true
      model: gpt-4.1
      tool-permission-mode: approve_all

spring:
  profiles:
    active: solo                      # solo | team
  datasource:
    url: jdbc:h2:file:./data/enterpriseclaw
  threads:
    virtual:
      enabled: true                   # Virtual threads for all request processing
```

## Key Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| Spring Boot | 4.0.0-RC2 | Application framework |
| Spring AI | 2.0.0-M4 | OpenAI, Anthropic, Ollama model starters, MCP, pgvector |
| spring-ai-agent-utils | 0.5.0 | SkillsTool, AskUserQuestionTool, TodoWriteTool |
| Picocli | latest | CLI command parsing |
| Testcontainers | 1.20.6 | PostgreSQL + Ollama for integration tests |
| Flyway | latest | Database migrations |
| Lombok | latest | Entity boilerplate reduction |
| SnakeYAML | latest | SKILL.md frontmatter parsing |
