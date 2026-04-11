# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

EnterpriseClaw is a browser-first AI agentic platform — reimplements OpenClaw concepts (agent loop, skills-as-folders, WebSocket RPC, CLI) using Java/Spring AI backend + React frontend + JLink CLI. Two operating modes: **solo** (H2, no auth) and **team** (PostgreSQL + pgvector, multi-tenant).

## Required Workflow

For any non-trivial change, follow this sequence:

1. Read the relevant code and existing docs first.
2. Create a new spec in `docs/specs/` or update the existing spec that already owns that behavior.
3. Implement only after the spec exists.
4. Update durable docs if shipped behavior changed.
5. Verify the implementation with the most relevant tests or validation commands available.

Default to a spec for:

- feature work
- CLI behavior changes
- provider/model integration changes
- skills system changes (SKILL.md format, loading, registration)
- WebSocket RPC protocol changes
- settings and configuration changes
- test strategy changes

For very small changes, keep the ceremony small:

- typo-only changes may skip a new spec
- tightly scoped bug fixes should still update an existing spec or add a short new one

### Spec Rules

- Prefer updating an existing spec when the behavior already has a home in `docs/specs/`.
- Create a new spec when the change introduces a distinct behavior, workflow, or subsystem concern.
- Keep specs concrete. Describe user-visible behavior, config shape, edge cases, and acceptance criteria.
- Specs should reflect intended behavior before implementation, not just summarize the code after the fact.

Use `docs/specs/spec-template.md` when creating a new spec.

### Implementation Follow-Through

After code changes, check whether these also need updates:

- `CLAUDE.md`
- `AGENTS.md`
- `docs/fsd-enterpriseclaw.md`
- `docs/trd-enterpriseclaw.md`
- `skills/*/SKILL.md` (if skill behavior changed)

If user-visible behavior changed and the docs were not updated, the work is incomplete.

### Verification Expectations

Before closing work:

- Run the narrowest useful tests first (`./gradlew test --tests "ClassName"`)
- Run broader validation if the change crosses subsystem boundaries (`task local:test:all`)
- Call out anything you could not verify

Avoid claiming behavior that is not reflected in code, tests, or current docs.

## Repository Layout

```
enterpriseclaw/
├── apps/
│   ├── server/          # Spring Boot 4.0.0-RC2 + Spring AI 2.0.0-M4 (Java 21)
│   ├── cli/             # Plain Java + Picocli + JLink (WebSocket client)
│   └── frontend/        # React 19 + TypeScript + Vite + Bun
├── skills/              # SKILL.md files (shared, loaded by server)
├── docs/                # FSD, TRD, product spec
│   └── specs/           # Behavior specs (create before implementing)
├── infra/deploy/        # Kamal deploy configs (per-app per-env)
├── .env.sample          # Secrets template (never commit .env)
├── application.env      # Non-secret config (committed)
├── Taskfile.yml         # Root orchestrator (includes local/dev/production)
├── Taskfile.local.yml   # Local dev tasks
├── docker-compose-postgres.yaml  # Shared dev DB (pgvector:pg16)
└── AGENTS.md
```

Each app under `apps/` is **fully independent** — own build system, own Taskfile, own Dockerfile. No shared classpaths or Gradle submodules.

## Build & Dev Commands

All commands use `task` (Taskfile.yml). Root env loaded via `dotenv: ['.env', 'application.env']`.

```bash
# Local development
task local:dev:all          # Start server (:8080) + frontend (:5173)
task local:dev:server       # Spring Boot only
task local:dev:frontend     # Vite only
task local:postgres:start   # Start pgvector via Docker
task local:postgres:shell   # psql into container

# Testing
task local:test:all         # Run all tests (server + frontend)
task local:test:server      # ./gradlew test (excludes @Tag("integration"))
task local:test:frontend    # bun run vitest --run

# Inside apps directly
cd apps/server && task test                # Server unit tests
cd apps/server && task test:integration    # Testcontainers (requires Docker)
cd apps/frontend && task test              # Frontend tests

# Single backend test
cd apps/server && ./gradlew test --tests "com.enterpriseclaw.chat.ChatControllerTest"

# Build
task local:build:all        # Frontend build + server JAR
task local:lint:all         # ESLint + Gradle check
task local:clean            # Remove all build artifacts

# Docker
task local:docker:all       # Build and start all containers
task local:docker:stop      # Stop all containers
```

## Architecture

### Server (`apps/server/`)

Spring Boot 4.0.0-RC2 + Spring AI 2.0.0-M4. Key packages under `src/main/java/com/enterpriseclaw/`:

| Package | Purpose |
|---------|---------|
| `chat` | REST controller, ChatService, ChatClient config, NDJSON streaming, interactive question tool |
| `chat/provider` | Token providers for Copilot (gh auth) and Codex (~/.codex/auth.json), ProviderModels registry |
| `websocket` | WebSocket JSON-RPC endpoint at `/ws`, method dispatcher, RPC types |
| `settings` | SettingsController — `GET /api/v1/settings/models`, providers, refresh |
| `gateway` | Execution pipeline: identity → policy → agent execution |
| `skills` | SkillLoader (parses SKILL.md), SkillRegistry, Spring AI `@Tool` implementations |
| `tenant` | Multi-tenancy via ThreadLocal `TenantContext` + servlet filter |
| `identity` | User identity resolution |
| `policy` | Tool permission evaluation |
| `audit` | Event logging and agent run tracking |
| `cronjobs` | Scheduled job entities |
| `model` | Shared DTOs |

### LLM Providers

All providers are proper Spring AI `ChatClient` beans with the same tool pipeline:

| Provider | ChatModel | Auth | Detection |
|----------|-----------|------|-----------|
| OpenAI | `OpenAiChatModel` | API key in `.env` | Key non-empty |
| Anthropic | `AnthropicChatModel` | API key in `.env` | Key non-empty |
| Ollama | `OllamaChatModel` | None (localhost:11434) | Ollama running |
| Copilot | `OpenAiChatModel` → `api.githubcopilot.com` | Token from `gh auth token` | gh CLI authenticated |
| Codex | `OpenAiChatModel` → OpenAI endpoint | JWT from `~/.codex/auth.json` | auth.json exists |

Model IDs are prefixed: `copilot:gpt-4.1`, `codex:gpt-5.4`, `ollama:llama3.2`. The prefix routes to the correct ChatClient; the model name after the prefix is sent to the API.

Frontend fetches available models dynamically from `GET /api/v1/settings/models`.

### Dual Transport

- **Browser:** REST + NDJSON streaming (`POST /api/v1/chat`)
- **CLI:** WebSocket JSON-RPC (`ws://localhost:8080/ws`)

**WebSocket RPC methods:**
```
health, session.list, session.create, session.delete,
skills.list, chat.send, models.list
```

### CLI (`apps/cli/`)

Plain Java 21 + Picocli. JLink native image (~25MB). Commands: `ec agent`, `ec sessions`, `ec skills`, `ec doctor`. Connects to server via `java.net.http.WebSocket`.

### Frontend (`apps/frontend/`)

React 19 + TypeScript + Vite + Bun + TailwindCSS 4.

- `src/lib/config.ts` — **Single source of truth** for all API endpoints
- `src/lib/http.ts` — `apiRequest<T>()` and `apiLongRequest<T>()` (NDJSON streaming)
- `src/domain/chat/useModels.ts` — Fetches available models from `/api/v1/settings/models`
- `src/domain/{name}/` — Domain-based folders: chat, skills, cronjobs, dashboard, audit, settings

### Skills (`skills/`)

SKILL.md files with YAML frontmatter (OpenClaw-compatible format). SkillLoader parses on startup, registers as Spring AI tool callbacks. Configurable via `enterpriseclaw.skills.directory`.

### Key Dependencies

- **Spring AI 2.0.0-M4** — OpenAI, Anthropic, Ollama model starters, MCP, pgvector
- **spring-ai-agent-utils 0.5.0** — SkillsTool, AskUserQuestionTool
- **Testcontainers 1.20.6** — PostgreSQL + Ollama for integration tests
- **Flyway** — Migrations in `apps/server/src/main/resources/db/migration/` (V1-V12)
- **Virtual threads** enabled

### Configuration

- `apps/server/src/main/resources/application.yml` — Main config, defaults to solo/H2
- `enterpriseclaw.chat.default-provider` — `auto | openai | anthropic | copilot | codex | ollama`
- `enterpriseclaw.skills.directory` — Path to skills folder (default: `../../skills`)
- Hibernate `ddl-auto: validate` — Flyway owns the schema

## Coding Conventions

**Backend:** Controllers `@RequestMapping("/api/v1/{domain}")`, `@Valid` bodies, interface-first services, Lombok entities, Java records for DTOs, AssertJ in tests.

**Frontend:** All endpoints via `config.ts`, domain folders, TailwindCSS only, Vitest + RTL + MSW.

## Documentation Map

- `CLAUDE.md`
  Project guidance for Claude Code. You are reading it.
- `AGENTS.md`
  AI agent quick reference — history, conventions, provider table, testing requirements.
- `docs/fsd-enterpriseclaw.md`
  Full functional specification — user flows, all planned endpoints.
- `docs/trd-enterpriseclaw.md`
  Technical requirements — architecture, deployment, Spring AI details.
- `docs/specs/`
  Behavior specs and implementation plans. New feature/change work starts here.
- `docs/specs/spec-template.md`
  Template for new specs.
- `skills/*/SKILL.md`
  Skill definitions (OpenClaw-compatible format). Each skill is a folder with a SKILL.md.
