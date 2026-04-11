# AGENTS.md — EnterpriseClaw

> **For AI coding agents (GitHub Copilot, Claude, Gemini, etc.)**  
> Read this file before making any changes to the repository. It describes the project purpose,
> history, architecture, conventions, and testing requirements in a single place.

---

## 1. Project Overview

**EnterpriseClaw** is a browser-first, self-contained AI agentic platform built with:

| Layer | Technology |
|---|---|
| Backend | Java 21 + Spring Boot 4.0.0-RC2 + Spring AI 2.0.0-M4 |
| CLI | Plain Java 21 + Picocli + JLink |
| Frontend | React 19 + TypeScript + Vite (Bun) |
| Database | H2 (solo mode) / PostgreSQL + pgvector (team mode) |
| Migrations | Flyway |
| Skills | SKILL.md files in `skills/` folder |
| Build | Gradle (server) + Bun (frontend) + JLink (CLI) |
| Dev workflow | `Taskfile.yml` (Reqsume-style multi-app) |

It reimplements the core concepts of [OpenClaw](https://github.com/openclaw) — agent loop, skills-as-folders,
WebSocket RPC, CLI — using Java/Spring AI. Browser-first React UI replaces messaging channels.

Key features: **Chat with AI agents**, **Agent Skills editor**, **CronJobs**, **Audit Log**,
**Observability Dashboard**, **Settings**.

---

## 2. Project History

### PR #1 — Functional & Technical Specification (merged 2026-02-28)

Added the two core design documents that describe every planned feature and the technical
implementation:

- `docs/fsd-enterpriseclaw.md` — Functional Specification (881 lines): OpenClaw feature mapping,
  React routes, Chat SSE protocol, Skills page, CronJobs, Dashboard, REST API surface (50+
  endpoints), `.env` / Taskfile developer workflow, acceptance criteria.
- `docs/trd-enterpriseclaw.md` — Technical Requirements Document: stack table, project layout,
  Taskfile spec, `.env` configuration, Spring AI integration, JLink / Docker deployment.

### PR #2 — AGENTS.md + API Contract E2E Test Suite (current)

- Added this `AGENTS.md` file for AI agent guidance.
- Added a comprehensive E2E API contract test suite covering all `/api/v1` endpoints:
  - Backend: `src/test/java/com/enterpriseclaw/chat/ApiContractTest.java` (Spring MockMvc)
  - Frontend: `frontend/src/tests/api-contracts.test.ts` (Vitest + MSW)

---

## 3. Repository Layout

```
enterpriseclaw/
├── apps/
│   ├── server/                        ← Spring Boot 4 + Spring AI (backend)
│   │   ├── build.gradle
│   │   ├── Taskfile.yml
│   │   └── src/main/java/com/enterpriseclaw/
│   │       ├── chat/                  ← ChatController, ChatService, DTOs, WebSocket
│   │       ├── websocket/             ← JSON-RPC endpoint, method dispatcher
│   │       ├── gateway/               ← Execution pipeline
│   │       ├── skills/                ← @Tool implementations + registry
│   │       ├── audit/                 ← AgentRunLog, AuditEvent
│   │       ├── cronjobs/              ← ScheduledJob, JobExecution
│   │       ├── tenant/                ← Multi-tenancy
│   │       ├── identity/              ← User resolution
│   │       └── policy/                ← Tool permissions
│   ├── cli/                           ← Plain Java + Picocli + JLink
│   │   └── src/main/java/com/enterpriseclaw/cli/
│   └── frontend/                      ← React 19 + Vite + Bun
│       └── src/
│           ├── lib/config.ts          ← SINGLE source of truth for API endpoints
│           ├── lib/http.ts            ← apiRequest, apiLongRequest (NDJSON)
│           └── domain/                ← chat, skills, cronjobs, dashboard, audit, settings
├── skills/                            ← SKILL.md files (OpenClaw-compatible format)
├── docs/                              ← FSD, TRD, product spec
├── infra/deploy/                      ← Kamal configs (per-app per-env)
├── .env.sample                        ← Secrets template
├── application.env                    ← Non-secret config (committed)
├── Taskfile.yml                       ← Root orchestrator
├── Taskfile.local.yml                 ← Local dev tasks
└── docker-compose-postgres.yaml       ← Shared dev DB
```

---

## 4. REST API Surface

All endpoints are prefixed with `/api/v1`. See `docs/fsd-enterpriseclaw.md` §12 for full detail.

| Domain | Implemented | Planned |
|---|---|---|
| Sessions | `GET /sessions`, `POST /sessions`, `DELETE /sessions/:id`, `PATCH /sessions/:id/title` | `GET /sessions/:id/export` |
| Chat | `POST /chat` (NDJSON stream), `POST /chat/answer` | — |
| Skills | — | Full CRUD + rescan + file ops |
| CronJobs | — | Full CRUD + trigger/enable/disable + history |
| Dashboard | — | Summary + agent-runs + skill-usage + llm-usage + cronjob-health |
| Audit Log | — | Paginated list + CSV export |
| Settings | — | Profile, model keys, user management |
| Auth | — | Login, logout, me, setup |
| Health | `/actuator/health` | — |

### Chat NDJSON event types

The `POST /api/v1/chat` endpoint streams newline-delimited JSON (`application/x-ndjson`):

```json
{"type":"token",     "text":"Hello "}
{"type":"tool_call", "tool":"code-reviewer"}
{"type":"tool_done", "tool":"code-reviewer"}
{"type":"question",  "questionId":"q1", "text":"Which branch?"}
{"type":"done"}
{"type":"error",     "message":"something went wrong"}
```

### Common error shape

```json
{
  "status": 400,
  "error": "Bad Request",
  "message": "sessionId must not be blank",
  "path": "/api/v1/chat"
}
```

---

## 5. Development Workflow

```bash
# Start both servers (hot-reload)
task local:dev:all        # Spring Boot :8080 + Vite :5173

# Or individually
task local:dev:server     # Spring Boot only
task local:dev:frontend   # Vite only

# Run tests
task local:test:all       # All tests
task local:test:server    # ./gradlew test
task local:test:frontend  # bun vitest --run

# Build
task local:build:all      # Frontend + server JAR

# Database (team mode)
task local:postgres:start
task local:postgres:shell
```

The Vite dev server proxies `/api` → `http://localhost:8080`, so React code always uses relative
paths (e.g. `/api/v1/sessions`). Each app has its own `Taskfile.yml` under `apps/`.

---

## 6. Required Workflow

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

---

## 7. LLM Providers

All providers are proper Spring AI `ChatClient` beans sharing the same tool pipeline:

| Provider | Auth | Detection | Model prefix |
|----------|------|-----------|-------------|
| OpenAI | API key in `.env` | Key non-empty | (none) |
| Anthropic | API key in `.env` | Key non-empty | `claude` |
| Ollama | None (localhost:11434) | Ollama running | `ollama:` |
| Copilot | Token from `gh auth token` | gh CLI authenticated | `copilot:` |
| Codex | JWT from `~/.codex/auth.json` | auth.json exists | `codex:` |

- Copilot and Codex use `OpenAiChatModel` with custom base URLs — they implement the OpenAI-compatible chat completions API.
- Tokens are read from existing CLI auth (no new OAuth flows needed).
- Frontend fetches available models from `GET /api/v1/settings/models` — no hardcoded model list.
- Model IDs are prefixed: `copilot:gpt-4.1`, `codex:gpt-5.4`, `ollama:llama3.2`. The prefix routes to the correct ChatClient; the name after the prefix goes to the API.

---

## 8. Coding Conventions

### Backend (Spring Boot)

- Controllers use `@RequestMapping("/api/v1/{domain}")` at class level.
- Every request body is annotated with `@Valid`.
- Non-streaming endpoints return `ResponseEntity<T>`; streaming chat returns `ResponseBodyEmitter`.
- No business logic in controllers — delegate immediately to the service interface.
- Entities use Lombok `@Builder`, `@Data`, `@NoArgsConstructor`, `@AllArgsConstructor`.
- Repository tests use `@DataJpaTest`; controller tests use `@WebMvcTest`.
- Record DTOs with `jakarta.validation` constraints.

See `_bmad-output/planning-artifacts/coding-style-springboot.md` for the full style guide.

### Frontend (React / TypeScript)

- All API base URL and endpoint paths live **only** in `apps/frontend/src/lib/config.ts`.
- Use `apiRequest<T>()` for standard JSON requests; `apiLongRequest<T>()` for NDJSON streaming.
- Domain logic lives in `src/domain/<name>/`: `types.ts`, `<Name>.service.ts`, `<Name>Page.tsx`.
- Tests use Vitest + React Testing Library + MSW (`msw/node` for server-side interception).
- Do **not** inline API URLs in components — always reference `config.api.endpoints.*`.

See `_bmad-output/planning-artifacts/coding-style-reactjs.md` for the full style guide.

---

## 9. Testing Requirements

### Backend

- Unit / slice tests: `@WebMvcTest` for controllers, `@DataJpaTest` for repositories.
- API contract tests: `ApiContractTest.java` verifies HTTP method, path, status, and
  response-body shape for every implemented endpoint.
- Run with: `./gradlew test`

### Frontend

- Component render tests: React Testing Library in `*.test.tsx` co-located with components.
- Hook tests: Vitest + MSW in `domain/<name>/__tests__/`.
- API contract tests: `frontend/src/tests/api-contracts.test.ts` validates MSW mock shapes
  match the contracts consumed by `config.ts` endpoints.
- Run with: `cd frontend && bun vitest run`

---

## 10. Environment Variables

Copy `.env.sample` → `.env` and fill in at least one LLM key. Non-secret config is in `application.env` (committed):

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | One of these | OpenAI API key |
| `ANTHROPIC_API_KEY` | One of these | Anthropic API key |
| `SPRING_PROFILES_ACTIVE` | No (default: `solo`) | `solo` or `team` |
| `SERVER_PORT` | No (default: `8080`) | HTTP port |
| `SPRING_DATASOURCE_URL` | Team mode only | JDBC URL for PostgreSQL |
| `SPRING_DATASOURCE_USERNAME` | Team mode only | DB username |
| `SPRING_DATASOURCE_PASSWORD` | Team mode only | DB password |

---

## 11. Documentation Map

- `AGENTS.md`
  This file. Quick reference for AI coding agents.
- `CLAUDE.md`
  Project guidance for Claude Code — build commands, architecture, coding conventions.
- `docs/fsd-enterpriseclaw.md`
  Full functional specification — user flows, all planned endpoints.
- `docs/trd-enterpriseclaw.md`
  Technical requirements — architecture, deployment, Spring AI details.
- `docs/specs/`
  Behavior specs and implementation plans. New feature/change work starts here.
- `docs/specs/spec-template.md`
  Template for new specs.
- `apps/frontend/src/lib/config.ts`
  Single source of truth for all API endpoints.
- `skills/*/SKILL.md`
  Skill definitions (OpenClaw-compatible format). Each skill is a folder with a SKILL.md.

## 12. Key Files for AI Agents

When implementing a new feature, read these files in order:

1. `docs/specs/` — check for an existing spec, or create one
2. `docs/fsd-enterpriseclaw.md` — user-facing specification (what to build)
3. `docs/trd-enterpriseclaw.md` — technical specification (how to build it)
4. `apps/frontend/src/lib/config.ts` — canonical list of all API endpoints
5. Existing tests in `apps/server/src/test/` and `apps/frontend/src/` — test patterns to follow
6. `skills/*/SKILL.md` — skill definitions (OpenClaw-compatible format)
