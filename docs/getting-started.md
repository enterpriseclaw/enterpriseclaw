# Getting Started

This guide walks you from zero to a running EnterpriseClaw instance with your first AI chat.

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Java | 21+ | `brew install openjdk@21` or [jenv](https://www.jenv.be/) |
| Bun | latest | `brew install oven-sh/bun/bun` |
| Task | 3.x | `brew install go-task` |
| Docker | latest | [Docker Desktop](https://www.docker.com/products/docker-desktop) or Colima |
| Git | latest | `brew install git` |

Verify your setup:

```bash
task status
```

This checks that `java`, `git`, `task`, `bun`, and `docker` are all installed.

## Clone and Configure

```bash
git clone https://github.com/enterpriseclaw/enterpriseclaw.git
cd enterpriseclaw
```

Copy the secrets template and add at least one LLM API key:

```bash
cp .env.sample .env
```

Edit `.env` and fill in one or both keys:

```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

No API key? You can still use **GitHub Copilot** (if `gh auth token` works) or **Ollama** (if running locally). See [Providers](providers.md) for details.

Non-secret configuration lives in `application.env` (committed to git):

```bash
SPRING_PROFILES_ACTIVE=solo
SERVER_PORT=8080
ENTERPRISECLAW_CHAT_DEFAULT_PROVIDER=auto
ENTERPRISECLAW_CHAT_DEFAULT_MODEL=gpt-4.1
```

## Start Development Mode

```bash
task local:dev:all
```

This starts two processes:

- **Spring Boot server** on http://localhost:8080
- **Vite frontend** on http://localhost:5173

The Vite dev server proxies `/api` requests to the Spring Boot server, so you only need to open the frontend URL.

To start them individually:

```bash
task local:dev:server     # Spring Boot only
task local:dev:frontend   # Vite only
```

## Open the Browser

Navigate to http://localhost:5173. You should see the EnterpriseClaw chat interface.

## Your First Chat

1. The app creates a new session automatically.
2. Type a message in the input box at the bottom.
3. The response streams in real-time via NDJSON.

If you see a model selector, pick one from the dropdown. Available models depend on which providers are configured -- the frontend fetches them dynamically from the server.

## CLI Setup

The CLI is a separate Java application that communicates with the server over WebSocket.

### Build the CLI

```bash
cd apps/cli
task build
```

For a native image (~25MB, no JVM required):

```bash
cd apps/cli
task jlink
```

### Verify Connectivity

```bash
ec doctor
```

Expected output:

```
Server: ws://localhost:8080/ws
Status: UP
Version: 0.0.1-SNAPSHOT
```

### First CLI Chat

```bash
ec agent "Hello, what can you do?"
```

### Full Onboarding

Run the guided setup to check providers, models, and diagnostics:

```bash
ec setup
```

See [CLI](cli.md) for the full command reference.

## Team Mode (PostgreSQL)

Solo mode uses H2 (embedded, file-based). For multi-user/team mode with PostgreSQL + pgvector:

```bash
# Start PostgreSQL
task local:postgres:start

# Update .env
SPRING_PROFILES_ACTIVE=team
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/enterpriseclaw
SPRING_DATASOURCE_USERNAME=enterpriseclaw
SPRING_DATASOURCE_PASSWORD=enterpriseclaw
```

Then restart the server. Flyway will run migrations automatically.

## Next Steps

- [Architecture](architecture.md) -- understand how the system is built
- [Providers](providers.md) -- configure LLM providers
- [Skills](skills.md) -- create custom agent skills
- [Testing](testing.md) -- run and write tests
