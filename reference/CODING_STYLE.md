# Muthu's Coding Style & Conventions

A reference guide documenting how I write Spring AI (Spring Boot) and React applications.

---

## Table of Contents

- [General Philosophy](#general-philosophy)
- [Project Tooling](#project-tooling)
- [React / Frontend](#react--frontend)
- [Spring Boot / Backend](#spring-boot--backend)
- [API Design](#api-design)
- [Docker & Deployment](#docker--deployment)
- [Testing](#testing)

---

## General Philosophy

- **Prefer convention over configuration** — lean on frameworks (Spring Boot, Vite) defaults.
- **Centralized configuration** — a single `config.ts` or `application.properties` is the source of truth for endpoints, routes, feature flags, and env vars.
- **Domain-driven folder structure** — group by feature/domain, not by technical layer.
- **Minimal comments** — code should be self-documenting; use JSDoc/comments only for non-obvious logic.
- **Use Taskfile (`Taskfile.yml`)** as the project-level task runner for both frontend and backend (not Makefiles or npm scripts for orchestration).
- **Use `.env` files** for environment variables, loaded via Taskfile `dotenv` or Docker Compose `env_file`.

---

## Project Tooling

| Concern           | Frontend (React)                | Backend (Spring Boot)             |
| ----------------- | ------------------------------- | --------------------------------- |
| Language          | TypeScript (strict)             | Java 21                          |
| Build tool        | Vite 7+                        | Gradle (Groovy DSL)              |
| Package manager   | Bun (lockfile: `bun.lock`)      | Gradle wrapper (`gradlew`)       |
| Task runner       | Taskfile v3                     | Taskfile v3                      |
| Containerization  | Multi-stage Docker (Bun → Nginx)| Multi-stage Docker (Gradle → Temurin JRE) |
| Linting           | ESLint (flat config)            | —                                |
| CSS               | Tailwind CSS v4                 | —                                |
| UI components     | shadcn/ui (New York style)      | —                                |

---

## React / Frontend

### Stack

- **React 19** with **TypeScript ~5.9**
- **Vite** with `@vitejs/plugin-react` + **React Compiler** (`babel-plugin-react-compiler`)
- **Tailwind CSS v4** via `@tailwindcss/vite` plugin (no `tailwind.config.js`)
- **shadcn/ui** (New York variant, Lucide icons, CSS variables, neutral base color)
- **React Router v7** (`react-router-dom`) for routing
- **TanStack React Query v5** for server state management
- **Firebase** for Google OAuth (sign-in with popup → exchange token with backend)
- **IndexedDB** via `idb` for offline storage

### Folder Structure

```
src/
├── app/                    # App-level concerns
│   ├── components/         # App-specific components (ConsentOverlay, etc.)
│   ├── pages/              # Route-level page components
│   ├── providers/          # Context providers (AuthProvider, ThemeProvider)
│   ├── routing/            # Route definitions, guards (RequireAuth, RequireRole)
│   ├── shell/              # Layout: AppShell, Sidebar, Topbar, navConfig
│   └── ui/                 # App-specific UI primitives
├── components/             # Shared components (Login, Profile, NotificationContainer)
│   ├── auth/               # Auth-related shared components
│   └── ui/                 # shadcn/ui generated components
├── domain/                 # Feature modules (domain-driven)
│   ├── auth/               # types.ts, auth.service.ts, roles.ts
│   ├── iep/                # types.ts, iep.service.ts, pages, components
│   ├── advocacy/
│   ├── legal/
│   └── ...
├── hooks/                  # Shared custom hooks
│   ├── index.ts            # Barrel export
│   ├── useAuthSession.ts
│   ├── useAuthRole.ts
│   ├── useAuthUser.ts
│   ├── useNotification.tsx
│   └── useSessionStorage.ts
├── lib/                    # Shared utilities
│   ├── config.ts           # Centralized config (env vars, endpoints, routes)
│   ├── http.ts             # API client (apiRequest, apiLongRequest, ApiError)
│   ├── logger.ts           # Structured logger wrapper
│   ├── firebase.ts         # Firebase initialization
│   ├── utils.ts            # cn() helper for Tailwind
│   └── passwordPolicy.ts
├── App.tsx                 # Root component (providers tree)
├── main.tsx                # Entry point (createRoot)
└── index.css               # Global styles
```

### Component Conventions

- **Named exports** for components (not default exports): `export function AppShell() {}`
- **Function declarations** over arrow functions for components
- **Props inlined or as interfaces** — no `type Props = {...}` convention, use inline `{ children }: { children: ReactNode }`
- **`as const` for constants** — especially for role definitions, config objects
- **Provider pattern** — wrap context + hook together:
  ```tsx
  const MyContext = createContext<Value | null>(null);

  export function useMyContext() {
    const ctx = useContext(MyContext);
    if (!ctx) throw new Error("useMyContext must be used within MyProvider");
    return ctx;
  }

  export function MyProvider({ children }: { children: ReactNode }) {
    // ...
    return <MyContext.Provider value={value}>{children}</MyContext.Provider>;
  }
  ```
- **`useCallback` for all provider methods** exposed through context
- **No lazy loading** — direct imports for page components in route files

### Styling

- **Tailwind utility classes** directly in JSX — no CSS modules or styled-components
- **`cn()` helper** (`clsx` + `tailwind-merge`) for conditional class merging
- **shadcn/ui** for all standard UI primitives (Button, Dialog, Select, Tabs, etc.)
- **Lucide React** for icons
- **Responsive design** via Tailwind breakpoints (`md:`, `lg:`)

### Path Aliases

- `@/*` maps to `./src/*` (configured in both `tsconfig.json` and `vite.config.ts`)

### HTTP Client (`lib/http.ts`)

- Custom `apiRequest<T>()` function wrapping native `fetch` — no Axios
- Custom `apiLongRequest<T>()` for streaming NDJSON responses (log + result events)
- Custom `ApiError` class with `status` and `data` fields
- Auto-attaches Bearer token from `sessionStorage`
- Base URL from `config.api.baseUrl` (via `VITE_BASE_API_URL` env var)
- Configurable timeout with `AbortController`

### Centralized Config (`lib/config.ts`)

- Single `config` object exported as `const`
- Contains: API base URL, all endpoint paths, route paths, session keys, feature flags, logging level
- Dynamic route helpers as functions: `childProfileEdit: (id: string) => \`/child-profile/${id}\``
- Endpoint paths use `:id` placeholder pattern: `"/api/v1/children/:id"`

### Logger (`lib/logger.ts`)

- Lightweight wrapper around `console.*`
- Structured logging with `[HH:MM:SS] [file:line] LEVEL: message` format
- Log level controlled by config (`debug` in dev, `info` in prod)
- Methods: `logger.debug()`, `logger.info()`, `logger.warn()`, `logger.error()`
- Accepts optional metadata object as second argument

### Auth Pattern

- **Firebase Google OAuth** → exchange token with backend for JWT session
- **JWT stored in `sessionStorage`** (not cookies, not localStorage)
- **Custom `useAuthSession` hook** backed by `sessionStorage`
- **Auto-refresh** token before expiry using `useEffect` + `setTimeout`
- **Role-based access control** with `ACCESS_POLICY` map and `RequireRole` guard
- Roles: `PARENT`, `ADVOCATE`, `TEACHER_THERAPIST`, `ADMIN`, `SUPPORT`

### Service Layer Pattern

- Services are **class-based singletons** with methods for CRUD operations
- Exported via factory function: `export function getIEPService(): IEPService { return instance; }`
- Each method wraps `apiRequest()` with try/catch, logging, and typed return values
- Types defined in sibling `types.ts` file: interfaces, `Omit<>` for create data, `Partial<>` for update data

### Provider Tree (App.tsx)

```tsx
<ThemeProvider>
  <NotificationProvider>
    <QueryClientProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <NotificationContainer />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </NotificationProvider>
</ThemeProvider>
```

### React Query Defaults

```ts
{
  refetchOnWindowFocus: false,
  retry: 1,
  staleTime: 5 * 60 * 1000, // 5 minutes
}
```

### Notification System

- Context-based notification provider with `showInfo`, `showSuccess`, `showWarning`, `showError`, `showProgress`
- Max 5 notifications visible at once
- Auto-dismiss after 5s (7s for errors), except progress type
- Returns notification ID for programmatic updates/dismissal

---

## Spring Boot / Backend

### Stack

- **Spring Boot 4.0** with **Java 21**
- **Spring AI 2.0** (milestone/snapshot) for LLM integration
- **Spring WebMVC** (not WebFlux)
- **Lombok** for boilerplate reduction
- **PgVector** as vector store (via `spring-ai-starter-vector-store-pgvector`)
- **PostgreSQL 16** with `pgvector` extension
- **Gradle** (Groovy DSL, not Kotlin DSL)

### Spring AI Integration

- Uses the Spring AI BOM (`spring-ai-bom:2.0.0-M2`)
- Key starters:
  - `spring-ai-starter-model-openai` — OpenAI chat model
  - `spring-ai-starter-vector-store-pgvector` — PgVector for RAG
  - `spring-ai-advisors-vector-store` — Vector store advisors

### API Pattern

- REST endpoints at `/api/` prefix
- Session-based AI patterns:
  - `/api/chatplain` — Simple chat (no system prompt, no memory)
  - `/api/chat` — Chat with system prompt
  - `/api/chatmemory` — Chat with conversation memory (per `sessionId`)
  - `/api/chatresponse` — Full response including metadata/usage tokens
  - `/api/recommend?genre=X` — Structured output (returns typed object)
  - `/api/tools/chat` — Tool calling (function calling)
  - `/api/rag/documents` — Ingest documents for RAG
  - `/api/rag/search` — Similarity search
  - `/api/rag/chat` — RAG-augmented chat
- Request body pattern: `{ "question": "...", "sessionId": "..." }`
- Response body pattern: `{ "question": "...", "answer": "..." }`

### Gradle Configuration

- Optimized `gradle.properties` for fast builds:
  - Daemon enabled, parallel builds, build caching
  - VFS watching, incremental compilation
  - Worker API with max 2 workers
- Repositories include Maven Central + Spring milestones/snapshots

### Database

- **PostgreSQL 16** with **pgvector** extension
- Run via Docker Compose (`docker-compose-postgres.yaml`)
- Uses external Docker network (`springisession-network`)
- Health checks configured

---

## API Design

### Versioned Endpoints

- All API endpoints follow `/api/v1/` prefix
- Resource-oriented REST: `/api/v1/children`, `/api/v1/goals`, `/api/v1/iep`
- Nested resources: `/api/v1/goals/:id/progress`, `/api/v1/iep/:id/analyze`
- Admin namespace: `/api/v1/admin/user-management/users`

### Auth Endpoints

- `POST /api/v1/auth/login` — Email/password login
- `POST /api/v1/auth/register` — Registration
- `POST /api/v1/auth/exchange-token` — Firebase token → JWT
- `POST /api/v1/auth/refresh` — Token refresh
- `GET /api/v1/auth/me` — Current user profile
- `POST /api/v1/auth/logout` — Logout

### Request/Response Conventions

- JSON content type throughout
- Bearer token authentication
- Error responses include `message` field
- Streaming responses use NDJSON with typed events: `{ type: "log" | "result" | "error", ... }`

---

## Docker & Deployment

### Frontend Dockerfile (Multi-stage)

1. **Build stage**: `oven/bun:1` — install deps with `bun install --frozen-lockfile`, build with `bun run build`
2. **Production stage**: `nginx:alpine` — serve static files from `/usr/share/nginx/html`
3. Vite env vars passed as `ARG` → `ENV` for build-time injection
4. Exposes port `8080`

### Backend Dockerfile (Multi-stage)

1. **Build stage**: `gradle:8.5-jdk21` — build with `./gradlew build -x test --no-daemon`
2. **Runtime stage**: `eclipse-temurin:21-jre-alpine` — run with `java -jar app.jar`
3. Exposes port `8080`

### Docker Compose

- Backend service with health check (`wget` to actuator endpoint)
- PostgreSQL with pgvector via separate compose file
- Environment variables passed from `.env` file
- `restart: unless-stopped` policy

---

## Testing

### HTTP-based API Testing

- **IntelliJ HTTP Client** (`.http` files) for API testing — not Postman
- Organized by session/topic: `requests/session1/chatplain.http`, `requests/session2/toolcalling.http`
- Environment config in `http-client.env.json` with variable substitution (`{{baseurl}}`)
- Inline test assertions using `> {% ... %}` blocks
- Also uses `ijhttp` CLI runner for automated test execution
- Direct API testing with `curl` scripts (`requests/curl-all.sh`)

### Frontend

- Build verification via `tsc -b && vite build`
- ESLint with flat config for static analysis

---

## Naming Conventions

| What                  | Convention                  | Example                          |
| --------------------- | --------------------------- | -------------------------------- |
| React components      | PascalCase                  | `AppShell`, `IEPAnalyzerPage`    |
| React hooks           | camelCase with `use` prefix | `useAuthSession`, `useNotification` |
| Service files         | kebab-case `.service.ts`    | `auth.service.ts`, `iep.service.ts` |
| Type files            | kebab-case `types.ts`       | `domain/auth/types.ts`           |
| Config files          | kebab-case                  | `navConfig.ts`, `config.ts`      |
| API endpoints         | kebab-case paths            | `/api/v1/auth/exchange-token`    |
| Routes                | kebab-case paths            | `/child-profile`, `/goal-progress` |
| TypeScript interfaces | PascalCase                  | `IEPAnalysisResult`, `NavItem`   |
| Constants             | UPPER_SNAKE_CASE            | `ROLES`, `ACCESS_POLICY`, `MAX_NOTIFICATIONS` |
| CSS classes           | Tailwind utilities          | `flex h-screen overflow-hidden`  |

---

## Key Patterns Summary

1. **Centralized config** — one file to rule endpoints, routes, env vars, and feature flags
2. **Domain folders** — each feature owns its types, service, pages, and components
3. **Service singleton pattern** — class + private instance + `getXxxService()` factory
4. **Context + hook pattern** — provider wraps state, hook enforces usage within provider
5. **Custom HTTP client** — thin `fetch` wrapper with auth, timeout, error handling, and streaming
6. **Structured logging** — consistent `logger.*` calls with metadata objects throughout
7. **Taskfile as orchestrator** — `task dev`, `task build`, `task docker-run` for all projects
8. **Multi-stage Docker builds** — separate build and runtime stages for minimal images
9. **`.http` files for API testing** — executable documentation with inline assertions
10. **Spring AI for LLM features** — chat, memory, structured output, tool calling, RAG — all via Spring AI starters
