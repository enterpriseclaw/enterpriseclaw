# Agents Guide (Web App)

Key rules for `apps/ui` (from `_bmad-output/project-context.md`):

## Technology & Structure
- Stack: Vite 7 + React 19, React Router 7, React Query 5, Radix UI, Tailwind CSS 4 (@tailwindcss/vite), CVA, tw-animate-css, Babel React Compiler, TypeScript ~5.9.
- Providers: Wrap app with ThemeProvider → NotificationProvider → QueryClientProvider → AuthProvider; `AppRoutes` handles titles and route guards (`RequireAuth`/`RequireRole`).
- Imports: Use `@/*` alias (tsconfig + Vite). Keep stdlib → third-party → local ordering.

## UI/Theming
- ThemeProvider syncs with localStorage `askiep.theme` and system prefers-color-scheme; toggles `.dark` on `document.documentElement`.
- Design tokens in `src/index.css` (OKLCH palette, light/dark, sidebar tokens). Reuse tokens; avoid inventing new color variables.
- Components: Prefer Radix primitives + CVA variants in `components/ui`. Keep functional components and hooks; avoid default exports.

## Data & Networking
- Use `apiRequest`/`apiLongRequest` for HTTP; they add Bearer tokens, timeouts, JSON headers, and stream parsing. Avoid raw fetch without auth headers.
- Config: Use `config.api.resolveUrl` and `config.routes`; do not hardcode URLs.

## Testing & Quality
- No current automated UI tests; if adding, colocate Vitest/RTL specs next to components and mock `apiRequest` rather than raw fetch.
- Lint with `npm run lint` (ESLint 9 flat, react-hooks/react-refresh). Style: 2-space indent, single quotes, trailing commas.

