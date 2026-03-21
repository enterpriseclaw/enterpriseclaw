# AGENTS.md — EnterpriseClaw

> **For AI coding agents (GitHub Copilot, Claude, Gemini, etc.)**  
> Read this file before making any changes to the repository. It describes the project purpose,
> history, architecture, conventions, and testing requirements in a single place.

---

## 1. Project Overview

**EnterpriseClaw** is a browser-first, self-contained AI agentic platform built with:

| Layer | Technology |
|---|---|
| Backend | Java 21 + Spring Boot 3.4 + Spring AI |
| Frontend | React 19 + TypeScript + Vite (Bun) |
| Database | H2 (solo mode) / PostgreSQL (team mode) |
| Migrations | Flyway |
| Build | Gradle (backend) + Bun (frontend) |
| Dev workflow | `Taskfile.yml` |

It reimplements the core concepts of [OpenClaw](https://github.com/openclaw) but removes the CLI and
messaging-platform gateway in favour of a browser-first Spring Boot + React application.

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
├── AGENTS.md                          ← this file
├── Taskfile.yml                       ← developer task runner
├── .env.example                       ← env template
├── build.gradle                       ← Gradle (backend)
├── docs/
│   ├── fsd-enterpriseclaw.md          ← Functional Specification (MUST READ)
│   └── trd-enterpriseclaw.md          ← Technical Requirements Document
├── src/
│   ├── main/java/com/enterpriseclaw/
│   │   ├── EnterpriseclawApplication.java
│   │   ├── audit/                     ← AgentRunLog, AuditEvent entities + repos
│   │   ├── chat/                      ← ChatController, ChatService, DTOs, entities
│   │   └── cronjobs/                  ← ScheduledJob, JobExecution entities + repos
│   └── test/java/com/enterpriseclaw/
│       ├── audit/AgentRunLogRepositoryTest.java
│       ├── chat/
│       │   ├── ApiContractTest.java   ← E2E API contract tests (NEW in PR #2)
│       │   ├── ChatControllerTest.java
│       │   └── ChatSessionRepositoryTest.java
│       └── cronjobs/ScheduledJobRepositoryTest.java
└── frontend/
    ├── package.json                   ← Bun / Vitest / React deps
    ├── vite.config.ts
    ├── vitest.config.ts
    └── src/
        ├── app/routing/AppRoutes.tsx  ← React router
        ├── lib/
        │   ├── config.ts              ← SINGLE source of truth for all API endpoints
        │   └── http.ts                ← apiRequest, apiLongRequest (NDJSON), ApiError
        ├── domain/
        │   ├── chat/                  ← ChatPage, useChat hook, types
        │   ├── skills/                ← SkillsPage, types
        │   ├── cronjobs/              ← CronJobsPage, types
        │   ├── dashboard/             ← DashboardPage, types
        │   ├── audit/                 ← AuditLogPage, types
        │   └── settings/              ← SettingsPage, types
        └── tests/
            ├── setup.ts               ← Vitest setup (jest-dom, MSW server start/stop)
            ├── api-contracts.test.ts  ← E2E API contract tests (NEW in PR #2)
            └── mocks/
                └── server.ts          ← MSW node server with default handlers
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
# Install frontend deps
task install           # bun install inside frontend/

# Start both servers (hot-reload)
task dev               # Spring Boot :8080 + Vite :5173 (proxies /api → :8080)

# Build the full artefact (React → static/ then Gradle JAR)
task build

# Run tests
task test:backend      # ./gradlew test
task test:frontend     # bun --cwd frontend vitest run
```

The Vite dev server proxies `/api` → `http://localhost:8080`, so React code always uses relative
paths (e.g. `/api/v1/sessions`).

---

## 6. Coding Conventions

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

- All API base URL and endpoint paths live **only** in `frontend/src/lib/config.ts`.
- Use `apiRequest<T>()` for standard JSON requests; `apiLongRequest<T>()` for NDJSON streaming.
- Domain logic lives in `src/domain/<name>/`: `types.ts`, `<Name>.service.ts`, `<Name>Page.tsx`.
- Tests use Vitest + React Testing Library + MSW (`msw/node` for server-side interception).
- Do **not** inline API URLs in components — always reference `config.api.endpoints.*`.

See `_bmad-output/planning-artifacts/coding-style-reactjs.md` for the full style guide.

---

## 7. Testing Requirements

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

## 8. Environment Variables

Copy `.env.example` → `.env` and fill in at least one LLM key:

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

## 9. Key Files for AI Agents

When implementing a new feature, read these files in order:

1. `docs/fsd-enterpriseclaw.md` — user-facing specification (what to build)
2. `docs/trd-enterpriseclaw.md` — technical specification (how to build it)
3. `_bmad-output/planning-artifacts/coding-style-springboot.md` — backend style
4. `_bmad-output/planning-artifacts/coding-style-reactjs.md` — frontend style
5. `frontend/src/lib/config.ts` — canonical list of all API endpoints
6. Existing tests in `src/test/` and `frontend/src/` — test patterns to follow
