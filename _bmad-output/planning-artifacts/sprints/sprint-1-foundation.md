# Sprint 1 — Foundation

> **Epic:** Epic 1 — Monorepo scaffold, Taskfile, build pipeline  
> **Goal:** A runnable monorepo where `task dev` starts both frontend and backend, `task test` runs cleanly, and `task build` produces a working JAR.  
> **Prerequisites:** None — this is Sprint 1.  
> **Test Gate:** `task test` green · `task build` produces a JAR that boots · `GET /actuator/health` returns `{"status":"UP"}`

---

## Context

This sprint creates the entire project skeleton. No features yet — just the foundation every subsequent sprint builds on. The developer doing this sprint must resist the urge to add features early.

**Key decisions baked in:**
- Gradle Groovy DSL (not Kotlin DSL)
- Bun as frontend package manager (not npm)
- React 19 + TypeScript + Vite 7 + Tailwind CSS v4 + shadcn/ui New York variant
- Spring Boot 4 + Java 21 + Flyway + H2 (solo mode default)
- NDJSON streaming architecture (no SSE)
- Solo mode only in this sprint

---

## Backend Deliverables

### 1. Gradle project scaffold

```
enterpriseclaw/
├── build.gradle          ← see coding-style-springboot.md §Gradle Build
├── gradle.properties     ← performance flags (parallel, cache, daemon)
├── gradlew + gradlew.bat
├── settings.gradle       ← rootProject.name = 'enterpriseclaw'
└── src/
    ├── main/java/com/enterpriseclaw/
    │   └── EnterpriseclawApplication.java
    └── main/resources/
        ├── application.yml
        └── application-solo.yml  (default)
```

`EnterpriseclawApplication.java`:
```java
@SpringBootApplication
public class EnterpriseclawApplication {
    public static void main(String[] args) {
        SpringApplication.run(EnterpriseclawApplication.class, args);
    }
}
```

### 2. application.yml (solo mode)

```yaml
spring:
  profiles:
    active: solo
  datasource:
    url: jdbc:h2:file:./data/enterpriseclaw
    driver-class-name: org.h2.Driver
    username: sa
    password: ''
  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: false
  flyway:
    enabled: true

management:
  endpoints:
    web:
      exposure:
        include: health, info

server:
  address: 127.0.0.1
  port: 8080
```

### 3. JPA Entities (all domains, no logic yet)

Create all entities with Flyway migrations. No business logic — just correct schema.

#### Entities to create

| Entity | Table | Key fields |
|---|---|---|
| `ChatSession` | `chat_sessions` | `id` (UUID), `userId`, `title`, `status`, `createdAt`, `lastMessageAt` |
| `ChatMessage` | `chat_messages` | `id` (UUID), `sessionId`, `role` (USER/ASSISTANT), `content`, `createdAt` |
| `AgentRunLog` | `agent_run_log` | `id`, `sessionId`, `userId`, `promptTokens`, `completionTokens`, `durationMs`, `skillActivated`, `createdAt` |
| `AuditEvent` | `audit_events` | `id`, `userId`, `eventType`, `details`, `sessionId`, `createdAt` |
| `ScheduledJob` | `scheduled_jobs` | `id`, `userId`, `name`, `prompt`, `cronExpression`, `status`, `lastRunAt`, `nextRunAt`, `createdAt` |
| `JobExecution` | `job_executions` | `id`, `jobId`, `startedAt`, `completedAt`, `status`, `tokensUsed`, `skillActivated`, `response` |

#### Flyway migration files

```
src/main/resources/db/migration/
├── V1__create_chat_sessions.sql
├── V2__create_chat_messages.sql
├── V3__create_agent_run_log.sql
├── V4__create_audit_events.sql
├── V5__create_scheduled_jobs.sql
└── V6__create_job_executions.sql
```

Example `V1__create_chat_sessions.sql`:
```sql
CREATE TABLE chat_sessions (
    id               VARCHAR(36)  PRIMARY KEY,
    user_id          VARCHAR(36)  NOT NULL,
    title            VARCHAR(60),
    status           VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    created_at       TIMESTAMP    NOT NULL,
    last_message_at  TIMESTAMP    NOT NULL
);
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
```

### 4. Repositories (interfaces only)

Create all JPA repository interfaces. No custom queries yet.

```java
public interface ChatSessionRepository extends JpaRepository<ChatSession, String> {}
public interface ChatMessageRepository extends JpaRepository<ChatMessage, String> {}
public interface AgentRunLogRepository extends JpaRepository<AgentRunLog, String> {}
public interface AuditEventRepository extends JpaRepository<AuditEvent, String> {}
public interface ScheduledJobRepository extends JpaRepository<ScheduledJob, String> {}
public interface JobExecutionRepository extends JpaRepository<JobExecution, String> {}
```

### 5. Health endpoint verification

`GET /actuator/health` must return HTTP 200 with `{"status":"UP"}`.

---

## Frontend Deliverables

### 1. Vite + React 19 scaffold

```
frontend/
├── src/
│   ├── app/
│   │   ├── providers/
│   │   │   ├── ThemeProvider.tsx
│   │   │   ├── NotificationProvider.tsx
│   │   │   └── QueryProvider.tsx
│   │   ├── routing/
│   │   │   └── AppRoutes.tsx        ← all routes stubbed
│   │   └── shell/
│   │       ├── AppShell.tsx         ← layout with sidebar + outlet
│   │       ├── Sidebar.tsx          ← nav links, session list placeholder
│   │       ├── Topbar.tsx           ← breadcrumb, model selector placeholder
│   │       └── navConfig.ts
│   ├── components/
│   │   └── ui/                      ← shadcn/ui components (add as needed)
│   ├── domain/
│   │   ├── chat/                    ← ChatPage.tsx (stub: "Chat coming soon")
│   │   ├── skills/                  ← SkillsPage.tsx (stub)
│   │   ├── cronjobs/                ← CronJobsPage.tsx (stub)
│   │   ├── dashboard/               ← DashboardPage.tsx (stub)
│   │   ├── audit/                   ← AuditLogPage.tsx (stub)
│   │   └── settings/                ← SettingsPage.tsx (stub)
│   ├── hooks/
│   │   ├── index.ts
│   │   ├── useNotification.tsx
│   │   └── useSessionStorage.ts
│   ├── lib/
│   │   ├── config.ts                ← full config object (see coding-style-reactjs.md)
│   │   ├── http.ts                  ← apiRequest + apiLongRequest (NDJSON)
│   │   ├── logger.ts
│   │   └── utils.ts                 ← cn() helper
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── components.json                  ← shadcn/ui config (New York, neutral, CSS vars)
└── eslint.config.js
```

### 2. package.json (key deps)

```json
{
  "name": "enterpriseclaw-frontend",
  "private": true,
  "scripts": {
    "dev":   "vite",
    "build": "tsc -b && vite build",
    "lint":  "eslint src",
    "test":  "vitest"
  },
  "dependencies": {
    "react":               "^19.0.0",
    "react-dom":           "^19.0.0",
    "react-router-dom":    "^7.0.0",
    "@tanstack/react-query":"^5.0.0",
    "lucide-react":        "latest",
    "clsx":                "^2.1.1",
    "tailwind-merge":      "^2.5.4"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "@tailwindcss/vite":    "^4.0.0",
    "tailwindcss":          "^4.0.0",
    "typescript":           "~5.9.0",
    "vite":                 "^7.0.0",
    "vitest":               "^2.0.0",
    "@testing-library/react":       "^16.0.0",
    "@testing-library/user-event":  "^14.0.0",
    "msw":                          "^2.0.0",
    "eslint":               "^9.0.0"
  }
}
```

### 3. All route stubs working

Navigate to every route — no 404s, each shows a "coming soon" placeholder with the page title.

---

## Taskfile.yml

```yaml
version: '3'

dotenv: ['.env']

tasks:

  install:
    desc: Install frontend dependencies
    dir: frontend
    cmds:
      - bun install

  dev:frontend:
    desc: Start Vite dev server (hot-reload, proxies /api/* to :8080)
    dir: frontend
    cmds:
      - bun run dev

  dev:backend:
    desc: Start Spring Boot (devtools auto-restart)
    cmds:
      - ./gradlew bootRun

  dev:
    desc: Start both frontend and backend
    deps: [dev:frontend, dev:backend]

  build:frontend:
    desc: Build React and copy output to static/
    dir: frontend
    cmds:
      - bun run build
      - mkdir -p ../src/main/resources/static
      - cp -r dist/. ../src/main/resources/static/

  build:
    desc: Full production build
    cmds:
      - task: build:frontend
      - ./gradlew build

  test:backend:
    desc: Run backend tests
    cmds:
      - ./gradlew test

  test:frontend:
    desc: Run frontend tests
    dir: frontend
    cmds:
      - bun run vitest --run

  test:
    desc: Run all tests
    cmds:
      - task: test:backend
      - task: test:frontend

  lint:frontend:
    desc: Lint frontend
    dir: frontend
    cmds:
      - bun run lint

  lint:backend:
    desc: Lint backend
    cmds:
      - ./gradlew check -x test

  lint:
    desc: Lint everything
    cmds:
      - task: lint:frontend
      - task: lint:backend

  clean:
    desc: Remove all build artefacts
    cmds:
      - rm -rf frontend/dist src/main/resources/static build
      - ./gradlew clean
```

---

## .env.example

```bash
# Copy to .env — never commit .env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Solo mode defaults (no changes needed for local dev)
SPRING_PROFILES_ACTIVE=solo
SERVER_PORT=8080
```

---

## Backend Tests

### `@DataJpaTest` for all repositories

```java
@DataJpaTest
class ChatSessionRepositoryTest {

    @Autowired ChatSessionRepository repo;

    @Test
    void save_andFindById_roundTrip() {
        ChatSession session = ChatSession.builder()
            .id(UUID.randomUUID().toString())
            .userId("user-1")
            .status(SessionStatus.ACTIVE)
            .createdAt(Instant.now())
            .lastMessageAt(Instant.now())
            .build();

        repo.save(session);
        Optional<ChatSession> found = repo.findById(session.getId());

        assertThat(found).isPresent();
        assertThat(found.get().getUserId()).isEqualTo("user-1");
    }
}
```

Write similar tests for every entity/repository.

---

## Frontend Tests

### Smoke: every route renders without error

```tsx
test.each(['/chat', '/skills', '/cronjobs', '/dashboard', '/audit-log', '/settings'])(
  'route %s renders without crashing',
  async (route) => {
    renderWithRouter(<App />, { initialEntries: [route] });
    // no error thrown = pass
  }
);
```

### lib/http.ts — `apiRequest` unit test

```ts
test('apiRequest throws ApiError on non-2xx response', async () => {
  server.use(http.get('/api/v1/test', () => new HttpResponse(null, { status: 404 })));
  await expect(apiRequest('/api/v1/test')).rejects.toMatchObject({ status: 404 });
});
```

---

## Acceptance Criteria

- [ ] `task install` runs cleanly with Bun
- [ ] `task dev` starts both frontend (:5173) and backend (:8080)
- [ ] `GET /actuator/health` returns `{"status":"UP"}`
- [ ] All 6 JPA entities created with Flyway migrations
- [ ] All 6 repository interfaces exist
- [ ] All routes navigate without 404 or React errors
- [ ] `task test` fully green (all backend + frontend tests pass)
- [ ] `task build` produces a JAR that boots to actuator health
- [ ] `task lint` clean

---

## Handover Notes

- Do **not** add any AI/LLM features — that is Sprint 3.
- Do **not** implement any page business logic — stubs only.
- Flyway migrations must be reversible if possible.
- H2 console is useful during dev: add `spring.h2.console.enabled=true` to `application-solo.yml` (remove for prod profile).
- The `src/main/resources/static/` folder is gitignored — always generated by `task build:frontend`.
