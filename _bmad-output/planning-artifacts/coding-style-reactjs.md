# EnterpriseClaw — React / Frontend Coding Style & Conventions

> Authoritative reference for all frontend developers on EnterpriseClaw.  
> Stack: React 19 · TypeScript ~5.9 · Vite 7 · Bun · Tailwind CSS v4 · shadcn/ui (New York) · React Router v7 · TanStack Query v5

---

## Table of Contents

- [General Philosophy](#general-philosophy)
- [Project Structure](#project-structure)
- [Naming Conventions](#naming-conventions)
- [Component Conventions](#component-conventions)
- [Routing](#routing)
- [HTTP Client & NDJSON Streaming](#http-client--ndjson-streaming)
- [Centralized Config](#centralized-config)
- [Service Layer](#service-layer)
- [State Management](#state-management)
- [Auth Pattern (Team Mode)](#auth-pattern-team-mode)
- [Styling](#styling)
- [Notification System](#notification-system)
- [Logger](#logger)
- [Testing](#testing)
- [Taskfile Commands](#taskfile-commands)

---

## General Philosophy

- **Convention over configuration** — lean on Vite, React Router v7, and TanStack Query defaults.
- **Domain-driven folder structure** — group by feature/domain, not by technical layer.
- **Centralized config** — one `config.ts` is the source of truth for all endpoints, routes, env vars, and feature flags.
- **Minimal comments** — code is self-documenting; JSDoc only for non-obvious logic.
- **Named exports** for all components — no default exports.
- **Function declarations** for components — not arrow functions.
- **Bun** as package manager (`bun install`, `bun run dev`, `bun run build`).

---

## Project Structure

```
frontend/src/
├── app/
│   ├── components/         ← App-specific components (e.g., WelcomeBanner)
│   ├── pages/              ← Route-level page stubs (re-export from domain)
│   ├── providers/          ← ThemeProvider, NotificationProvider, QueryClientProvider
│   ├── routing/            ← AppRoutes, route definitions, RequireAuth guard
│   ├── shell/              ← AppShell, Sidebar, Topbar, navConfig.ts
│   └── ui/                 ← App-specific UI primitives
├── components/
│   ├── auth/               ← LoginForm, etc.
│   └── ui/                 ← shadcn/ui generated components (Button, Dialog, etc.)
├── domain/
│   ├── chat/               ← types.ts, chat.service.ts, ChatPage, MessageThread, MessageInput
│   ├── skills/             ← types.ts, skills.service.ts, SkillsPage, SkillEditor
│   ├── cronjobs/           ← types.ts, cronjobs.service.ts, CronJobsPage, CronJobForm
│   ├── dashboard/          ← types.ts, dashboard.service.ts, DashboardPage, charts
│   ├── audit/              ← types.ts, audit.service.ts, AuditLogPage
│   └── settings/           ← types.ts, settings.service.ts, SettingsPage
├── hooks/
│   ├── index.ts            ← barrel export
│   ├── useNotification.tsx
│   └── useSessionStorage.ts
├── lib/
│   ├── config.ts           ← SINGLE source of truth for all config
│   ├── http.ts             ← apiRequest, apiLongRequest (NDJSON), ApiError
│   ├── logger.ts           ← structured logger wrapper
│   └── utils.ts            ← cn() helper
├── App.tsx                 ← provider tree root
├── main.tsx                ← createRoot entry point
└── index.css               ← global styles + Tailwind base
```

---

## Naming Conventions

| What | Convention | Example |
|---|---|---|
| React components | PascalCase | `MessageThread`, `SkillEditor` |
| Page components | PascalCase + `Page` suffix | `ChatPage`, `SkillsPage` |
| Custom hooks | camelCase, `use` prefix | `useChat`, `useSkills` |
| Service files | kebab-case `.service.ts` | `chat.service.ts` |
| Type files | `types.ts` per domain | `domain/chat/types.ts` |
| Config | kebab-case | `navConfig.ts`, `config.ts` |
| API endpoint paths | kebab-case | `/api/v1/chat`, `/api/v1/cronjobs` |
| Routes | kebab-case | `/chat`, `/skills/:name` |
| TypeScript interfaces | PascalCase | `ChatSession`, `SkillMetadata` |
| TypeScript enums / consts | `UPPER_SNAKE_CASE` | `SESSION_STATUS`, `MAX_NOTIFICATIONS` |
| CSS classes | Tailwind utilities only | `flex h-screen overflow-hidden` |

---

## Component Conventions

### Named exports, function declarations

```tsx
// ✅ Correct
export function MessageThread({ session }: { session: ChatSession }) {
  return <div>...</div>;
}

// ❌ Wrong — no default export, no arrow function for components
export default ({ session }) => <div>...</div>;
```

### Props typing — inline or interface

```tsx
// inline (simple)
export function SkillCard({ name, description }: { name: string; description: string }) {}

// interface (complex)
interface MessageThreadProps {
  session: ChatSession;
  onQuestion: (questionId: string, answer: string) => void;
}
export function MessageThread({ session, onQuestion }: MessageThreadProps) {}
```

### Context + Hook pattern

```tsx
const ChatContext = createContext<ChatContextValue | null>(null);

export function useChatContext() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChatContext must be used within ChatProvider');
  return ctx;
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const createSession = useCallback(async () => { ... }, []);

  return (
    <ChatContext.Provider value={{ sessions, createSession }}>
      {children}
    </ChatContext.Provider>
  );
}
```

### `as const` for config objects and role maps

```ts
export const NAV_ITEMS = [
  { label: 'Chat',      path: '/chat',      icon: MessageSquare },
  { label: 'Skills',    path: '/skills',    icon: Puzzle },
  { label: 'CronJobs',  path: '/cronjobs',  icon: Clock },
  { label: 'Dashboard', path: '/dashboard', icon: BarChart2 },
  { label: 'Audit Log', path: '/audit-log', icon: FileText },
  { label: 'Settings',  path: '/settings',  icon: Settings },
] as const;
```

---

## Routing

React Router v7 (`react-router-dom`). **No lazy loading** — direct imports for all page components.

```tsx
// app/routing/AppRoutes.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { ChatPage }       from '@/domain/chat/ChatPage';
import { SkillsPage }     from '@/domain/skills/SkillsPage';
import { SkillEditorPage }from '@/domain/skills/SkillEditorPage';
import { CronJobsPage }   from '@/domain/cronjobs/CronJobsPage';
import { DashboardPage }  from '@/domain/dashboard/DashboardPage';
import { AuditLogPage }   from '@/domain/audit/AuditLogPage';
import { SettingsPage }   from '@/domain/settings/SettingsPage';
import { AppShell }       from '@/app/shell/AppShell';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/chat" replace />} />
        <Route path="/chat"              element={<ChatPage />} />
        <Route path="/chat/:sessionId"   element={<ChatPage />} />
        <Route path="/skills"            element={<SkillsPage />} />
        <Route path="/skills/new"        element={<SkillEditorPage />} />
        <Route path="/skills/:name"      element={<SkillEditorPage />} />
        <Route path="/cronjobs"          element={<CronJobsPage />} />
        <Route path="/dashboard"         element={<DashboardPage />} />
        <Route path="/audit-log"         element={<AuditLogPage />} />
        <Route path="/settings"          element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
```

---

## HTTP Client & NDJSON Streaming

All HTTP calls go through `lib/http.ts`. **No Axios.**

### `apiRequest<T>` — standard JSON

```ts
// lib/http.ts
export class ApiError extends Error {
  constructor(public readonly status: number, public readonly data: unknown) {
    super(`API error ${status}`);
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = sessionStorage.getItem(config.session.tokenKey);
  const response = await fetch(`${config.api.baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    signal: options.signal ?? AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ApiError(response.status, data);
  }

  return response.json();
}
```

### `apiLongRequest` — NDJSON streaming (for chat)

```ts
// lib/http.ts
export async function* apiLongRequest<T>(
  path: string,
  body: unknown,
  signal?: AbortSignal
): AsyncGenerator<T> {
  const token = sessionStorage.getItem(config.session.tokenKey);
  const response = await fetch(`${config.api.baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/x-ndjson',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal: signal ?? AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ApiError(response.status, data);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (line.trim()) yield JSON.parse(line) as T;
    }
  }
  if (buffer.trim()) yield JSON.parse(buffer) as T;
}
```

### Usage in a hook

```ts
// domain/chat/useChat.ts
export function useChat(sessionId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);

  const sendMessage = useCallback(async (text: string, model: string) => {
    setStreaming(true);
    const abortController = new AbortController();

    try {
      for await (const event of apiLongRequest<ChatEvent>(
        config.api.endpoints.chat,
        { sessionId, message: text, model },
        abortController.signal
      )) {
        if (event.type === 'token')    setMessages(m => appendToken(m, event.text!));
        if (event.type === 'tool_call') setMessages(m => addToolChip(m, event.tool!, 'running'));
        if (event.type === 'tool_done') setMessages(m => updateToolChip(m, event.tool!, 'done'));
        if (event.type === 'question') setMessages(m => addQuestionCard(m, event));
        if (event.type === 'done')     setStreaming(false);
        if (event.type === 'error')    { setStreaming(false); throw new Error(event.message); }
      }
    } finally {
      setStreaming(false);
    }
  }, [sessionId]);

  return { messages, streaming, sendMessage };
}
```

---

## Centralized Config

```ts
// lib/config.ts
export const config = {
  api: {
    baseUrl: import.meta.env.VITE_BASE_API_URL ?? '',
    endpoints: {
      sessions:      '/api/v1/sessions',
      session:       (id: string) => `/api/v1/sessions/${id}`,
      chat:          '/api/v1/chat',
      chatAnswer:    '/api/v1/chat/answer',
      skills:        '/api/v1/skills',
      skill:         (name: string) => `/api/v1/skills/${name}`,
      skillRescan:   '/api/v1/skills/rescan',
      cronjobs:      '/api/v1/cronjobs',
      cronjob:       (id: string) => `/api/v1/cronjobs/${id}`,
      dashboard:     '/api/v1/dashboard',
      auditLog:      '/api/v1/audit-log',
      settings:      '/api/v1/settings',
      health:        '/actuator/health',
    },
  },
  routes: {
    chat:       '/chat',
    chatSession:(id: string) => `/chat/${id}`,
    skills:     '/skills',
    skillNew:   '/skills/new',
    skill:      (name: string) => `/skills/${name}`,
    cronjobs:   '/cronjobs',
    dashboard:  '/dashboard',
    auditLog:   '/audit-log',
    settings:   '/settings',
    login:      '/login',
  },
  session: {
    tokenKey: 'ec_auth_token',
  },
  ui: {
    maxNotifications:     5,
    notificationTimeout:  5000,
    errorTimeout:         7000,
    sessionListLimit:     50,
    maxFileUploadBytes:   10 * 1024 * 1024,
  },
  logging: {
    level: import.meta.env.DEV ? 'debug' : 'info' as const,
  },
} as const;
```

---

## Service Layer

Services are **class-based singletons**, exported via factory function. Each method wraps `apiRequest` with try/catch and logging.

```ts
// domain/skills/skills.service.ts
import { apiRequest } from '@/lib/http';
import { config }     from '@/lib/config';
import { logger }     from '@/lib/logger';
import type { Skill, CreateSkillData } from './types';

class SkillsService {
  async list(): Promise<Skill[]> {
    try {
      return await apiRequest<Skill[]>(config.api.endpoints.skills);
    } catch (error) {
      logger.error('Failed to list skills', { error });
      throw error;
    }
  }

  async get(name: string): Promise<Skill> {
    try {
      return await apiRequest<Skill>(config.api.endpoints.skill(name));
    } catch (error) {
      logger.error('Failed to get skill', { name, error });
      throw error;
    }
  }

  async create(data: CreateSkillData): Promise<Skill> {
    try {
      return await apiRequest<Skill>(config.api.endpoints.skills, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (error) {
      logger.error('Failed to create skill', { data, error });
      throw error;
    }
  }
}

let instance: SkillsService | null = null;
export function getSkillsService(): SkillsService {
  if (!instance) instance = new SkillsService();
  return instance;
}
```

---

## State Management

- **Server state** — TanStack Query v5. All API reads go through `useQuery`/`useMutation`.
- **UI/local state** — React `useState`/`useReducer` within components or custom hooks.
- **Cross-component state** — React Context + custom hook (see Context + Hook pattern above).
- **Streaming state** — managed in custom hooks (`useChat`) using `useState` + async generators.
- **No Redux, no Zustand** unless complexity genuinely demands it.

### TanStack Query defaults

```ts
// app/providers/QueryProvider.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});
```

---

## Auth Pattern (Team Mode)

- **Solo mode**: no auth. Token storage not used.
- **Team mode**: form-based login → backend returns JWT → stored in `sessionStorage`.
- **`useAuthSession`** hook reads/writes token from `sessionStorage[config.session.tokenKey]`.
- **`RequireAuth`** guard wraps protected routes — redirects to `/login` if no token.
- **Auto-refresh** via `useEffect` + `setTimeout` before token expiry.

```tsx
// app/routing/RequireAuth.tsx
export function RequireAuth({ children }: { children: ReactNode }) {
  const token = sessionStorage.getItem(config.session.tokenKey);
  if (!token) return <Navigate to={config.routes.login} replace />;
  return <>{children}</>;
}
```

---

## Styling

- **Tailwind utility classes** directly in JSX — no CSS modules or styled-components.
- **`cn()`** helper (clsx + tailwind-merge) for conditional class merging.
- **shadcn/ui** for all standard UI primitives (Button, Dialog, Select, Tabs, Badge, etc.).
- **Lucide React** for all icons.
- **Responsive** via Tailwind breakpoints (`md:`, `lg:`).
- **No `tailwind.config.js`** — Tailwind CSS v4 via `@tailwindcss/vite` plugin.

```ts
// lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

```tsx
// Usage
<button className={cn('px-4 py-2 rounded', isActive && 'bg-primary text-white')} />
```

---

## Notification System

Context-based. Use `useNotification()` hook anywhere.

```ts
const { showSuccess, showError, showInfo, showProgress } = useNotification();

showSuccess('Skill saved successfully');
showError('Failed to connect to backend');
const id = showProgress('Running skill test...');
// later:
dismissNotification(id);
```

**Rules:**
- Max 5 notifications at once (`config.ui.maxNotifications`).
- Auto-dismiss after 5s (errors: 7s).
- Progress type never auto-dismisses.

---

## Logger

```ts
// lib/logger.ts
import { config } from './config';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

function log(level: LogLevel, message: string, meta?: object) {
  if (LEVELS[level] < LEVELS[config.logging.level]) return;
  const time = new Date().toTimeString().slice(0, 8);
  console[level](`[${time}] ${level.toUpperCase()}: ${message}`, meta ?? '');
}

export const logger = {
  debug: (msg: string, meta?: object) => log('debug', msg, meta),
  info:  (msg: string, meta?: object) => log('info',  msg, meta),
  warn:  (msg: string, meta?: object) => log('warn',  msg, meta),
  error: (msg: string, meta?: object) => log('error', msg, meta),
};
```

---

## Testing

### Tools

| Tool | Purpose |
|---|---|
| Vitest | Test runner |
| React Testing Library | Component testing |
| `msw` (Mock Service Worker) | HTTP mocking incl. NDJSON streams |
| `@testing-library/user-event` | Realistic user interactions |

### NDJSON stream mocking with msw

```ts
// tests/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const chatHandlers = [
  http.post('/api/v1/chat', () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(ctrl) {
        ctrl.enqueue(encoder.encode('{"type":"token","text":"Hello"}\n'));
        ctrl.enqueue(encoder.encode('{"type":"token","text":" world"}\n'));
        ctrl.enqueue(encoder.encode('{"type":"done"}\n'));
        ctrl.close();
      },
    });
    return new HttpResponse(stream, {
      headers: { 'Content-Type': 'application/x-ndjson' },
    });
  }),
];
```

### Component test

```tsx
// domain/chat/ChatPage.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatPage } from './ChatPage';
import { server } from '@/tests/mocks/server';
import { chatHandlers } from '@/tests/mocks/handlers';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('sends message and renders streamed response', async () => {
  server.use(...chatHandlers);
  render(<ChatPage />);

  const input = screen.getByRole('textbox');
  await userEvent.type(input, 'Hello{enter}');

  await screen.findByText('Hello world');
});
```

### Service unit test

```ts
// domain/skills/skills.service.test.ts
import { getSkillsService } from './skills.service';
import { server } from '@/tests/mocks/server';
import { http, HttpResponse } from 'msw';

test('list returns skills array', async () => {
  server.use(
    http.get('/api/v1/skills', () =>
      HttpResponse.json([{ name: 'code-reviewer', description: 'Reviews code' }])
    )
  );

  const skills = await getSkillsService().list();
  expect(skills).toHaveLength(1);
  expect(skills[0].name).toBe('code-reviewer');
});
```

### Test naming

```
describe('ChatPage', () => {
  test('renders welcome banner when no sessions exist', ...)
  test('creates session and updates URL on first message', ...)
  test('renders question card when question event received', ...)
})
```

### Build verification

```bash
bun run tsc -b && bun run build   # TypeScript + Vite build — zero errors required
bun run lint                       # ESLint flat config — zero warnings in CI
```

---

## App.tsx Provider Tree

```tsx
export function App() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AppRoutes />
            <NotificationContainer />
          </BrowserRouter>
        </QueryClientProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}
```

---

## Taskfile Commands

| Command | What it does |
|---|---|
| `task install` | `bun install` in `frontend/` |
| `task dev:frontend` | Vite dev server on :5173, proxy `/api/*` → :8080 |
| `task test:frontend` | `bun run vitest --run` |
| `task build:frontend` | Build + copy `dist/` to `../src/main/resources/static/` |
| `task lint:frontend` | ESLint flat config |

---

## Path Aliases

`@/*` maps to `./src/*`. Configured in both `tsconfig.json` and `vite.config.ts`:

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    proxy: { '/api': 'http://localhost:8080' },
  },
});
```
