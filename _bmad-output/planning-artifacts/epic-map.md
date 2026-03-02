# EnterpriseClaw — Epic Map & Sprint Overview

> **Project:** EnterpriseClaw  
> **Stack:** Spring Boot 4 + Java 21 + Spring AI 2.0 | React 19 + Vite 7 + Bun + TypeScript  
> **Build:** Gradle (Groovy DSL) | Taskfile v3  
> **Streaming:** NDJSON (`application/x-ndjson`) — NOT SSE  
> **Modes:** Solo (H2, no auth) → Team (Postgres, Spring Security) — solo first  

---

## Epic Map

| Epic | Name | Sprint(s) | Owner Suggestion |
|---|---|---|---|
| Epic 1 | Foundation — monorepo scaffold, Taskfile, CI | Sprint 1 | DevOps / Backend Lead |
| Epic 2 | Walking Skeleton — chat end-to-end with stub LLM | Sprint 2 | Full-stack |
| Epic 3 | Real AI Core — ChatClient, SkillsTool, AskUserQuestion, Audit | Sprint 3 | Backend AI specialist |
| Epic 4 | Skills Management — CRUD, editor, built-in skills | Sprint 4 | Full-stack |
| Epic 5 | CronJobs — scheduler engine, CRUD, trigger | Sprint 5 | Backend |
| Epic 6 | Observability + Settings — dashboard, audit log, settings | Sprint 6 | Full-stack |
| Epic 7 | Team Mode — Spring Security, login, user mgmt, Postgres | Sprint 7 | Backend |
| Epic 8 | Hardening — Docker, JLink, smoke tests, CI pipeline | Sprint 8 | DevOps |

---

## Sprint Files

| Sprint | File |
|---|---|
| Sprint 1 | `sprints/sprint-1-foundation.md` |
| Sprint 2 | `sprints/sprint-2-walking-skeleton.md` |
| Sprint 3 | `sprints/sprint-3-real-ai-core.md` |
| Sprint 4 | `sprints/sprint-4-skills.md` |
| Sprint 5 | `sprints/sprint-5-cronjobs.md` |
| Sprint 6 | `sprints/sprint-6-observability-settings.md` |
| Sprint 7 | `sprints/sprint-7-team-mode.md` |
| Sprint 8 | `sprints/sprint-8-hardening.md` |

---

## Reference Files

| File | Purpose |
|---|---|
| `coding-style-springboot.md` | Spring Boot conventions, patterns, structure |
| `coding-style-reactjs.md` | React conventions, patterns, structure |
| `test-strategy.md` | Full test pyramid — unit, slice, integration, e2e |

---

## Key Architecture Decisions

1. **NDJSON streaming** (`application/x-ndjson`) for `/api/v1/chat` — not SSE, not WebSocket
2. **Spring WebMVC** (not WebFlux) — `ResponseBodyEmitter` with Java 21 virtual threads for streaming
3. **Solo mode first** — H2 embedded, no auth; team mode added in Sprint 7
4. **Groovy DSL** for `build.gradle` (not Kotlin DSL)
5. **Bun** as frontend package manager (not npm/yarn)
6. **React 19** with React Compiler (`babel-plugin-react-compiler`)
7. **Tailwind CSS v4** (no `tailwind.config.js`), shadcn/ui New York variant
8. **Domain-driven folder structure** in both backend and frontend
9. **`task` (Taskfile v3)** as the single task runner — `task dev`, `task test`, `task build`
10. **WireMock** for LLM provider stubbing in all integration tests — no real API key needed in CI

---

## Test Gate Per Sprint

Every sprint must end with:
- [ ] `task test` fully green (all backend + frontend tests pass)
- [ ] `task build` produces a working JAR / frontend bundle
- [ ] `task lint` clean (ESLint + Checkstyle)
- [ ] Acceptance criteria in the sprint file checked off

---

## Monorepo Structure (final)

```
enterpriseclaw/
├── frontend/                   ← React 19 app (Vite + Bun)
│   ├── src/
│   │   ├── app/                ← shell, providers, routing
│   │   ├── components/         ← shared components
│   │   ├── domain/             ← chat/, skills/, cronjobs/, dashboard/, settings/
│   │   ├── hooks/              ← shared hooks
│   │   └── lib/                ← config.ts, http.ts, logger.ts
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── src/main/java/com/enterpriseclaw/
│   ├── agent/                  ← ChatClient config, advisors, tools
│   ├── chat/                   ← ChatController, ChatService, entities
│   ├── skills/                 ← SkillsController, SkillsService
│   ├── cronjobs/               ← CronJobController, DynamicCronJobRunner
│   ├── dashboard/              ← DashboardController, metrics queries
│   ├── audit/                  ← AuditEvent, EnterpriseAuditAdvisor
│   └── settings/               ← SettingsController
├── src/main/resources/
│   ├── application.yml
│   ├── application-team.yml
│   ├── db/migration/           ← Flyway SQL migrations
│   └── static/                 ← React build output (gitignored, generated)
├── .claude/skills/             ← SKILL.md files
├── requests/                   ← .http smoke test files
├── Taskfile.yml
├── build.gradle
├── gradle.properties
├── .env.example
└── docker-compose.yml
```
