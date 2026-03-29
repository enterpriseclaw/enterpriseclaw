# AskIEP — LLM Build Instructions v2

This document is a **flow-level, step-by-step instruction spec** for an LLM to generate the AskIEP web UX using **React Router DOM + Bun + Tailwind + shadcn/ui**, following PRD as the source of truth and mockups as UX guidance only.

> **Changes requested**
>
> 1. Use file name pattern `*.service.ts` (no `mock` in filenames). Implementation can return mocked data now, but must be swappable later.
> 2. Add a reusable `useSessionStorage()` hook (modeled after `useLocalStorage` example).
> 3. Add ThemeProvider for **automatic theme switching** based on `prefers-color-scheme: dark` (your provided pattern), toggling `.dark` on `document.documentElement`.

---

## 0) Hard rules (do not break)

1. **PRD is source of truth** for features and constraints. Mockups guide **UX layout + menu + component treatment** only.
2. Use **Tailwind + shadcn/ui** only.

   * Do **not** introduce custom palettes or hardcoded hex colors.
   * Use semantic tokens: `bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-card`, `bg-muted`, etc.
3. Use **React Router DOM** with nested routes.
4. **Every page except `/login` and `/register` is protected**.
5. Role-based access control (RBAC) must be enforced in:

   * Route guard (hard-block)
   * Sidebar menu (hide/disable)
6. Every page has a **domain service file** named `*.service.ts` that currently returns mocked data (async + latency), but can be swapped to real network calls later.
7. Auth is stored in **sessionStorage**.
8. Do not include UI copy that promises where data is stored, how encryption works, or “edge/local/cloud” claims.

---

## 1) Project structure (domain-level packaging)

Generate/organize code like:

```
src/
  app/
    shell/
      AppShell.tsx
      Sidebar.tsx
      Topbar.tsx
      navConfig.ts
    routing/
      AppRoutes.tsx
      guards/
        RequireAuth.tsx
        RequireRole.tsx
    providers/
      AuthProvider.tsx
      ThemeProvider.tsx
    ui/
      PageHeader.tsx
      LoadingState.tsx
      EmptyState.tsx
  domain/
    auth/
      types.ts
      roles.ts
      auth.service.ts
      auth.storage.ts
      auth.store.ts
    dashboard/
      types.ts
      dashboard.service.ts
    child/
      types.ts
      child.service.ts
    iep/
      types.ts
      iep.service.ts
    goals/
      types.ts
      goals.service.ts
    behavior/
      types.ts
      behavior.service.ts
    contact/
      types.ts
      contact.service.ts
    letters/
      types.ts
      letters.service.ts
    advocacy/
      types.ts
      advocacy.service.ts
    compliance/
      types.ts
      compliance.service.ts
    legal/
      types.ts
      legal.service.ts
    resources/
      types.ts
      resources.service.ts
    settings/
      types.ts
      settings.service.ts
  hooks/
    useSessionStorage.ts
  pages/
    LoginPage.tsx
    RegisterPage.tsx
    DashboardPage.tsx
    ChildProfilePage.tsx
    IEPAnalyzerPage.tsx
    GoalProgressPage.tsx
    BehaviorABCPage.tsx
    ContactLogPage.tsx
    LetterWriterPage.tsx
    AdvocacyLabPage.tsx
    CompliancePage.tsx
    LegalSupportPage.tsx
    ResourcesPage.tsx
    SettingsPage.tsx
    AccessDeniedPage.tsx
    NotFoundPage.tsx
  App.tsx
  index.css (already imports globals.css)
```

**Rules**

* Pages do not inline JSON; they call domain services.
* Pages do not import service implementations directly; they use factory functions (see §7).

---

## 2) Roles + access policy

Create `src/domain/auth/roles.ts`:

* Roles:

  * `PARENT`
  * `ADVOCATE`
  * `TEACHER_THERAPIST`
  * `ADMIN`

Create a central access policy map (pure data):

* PARENT: all pages
* ADVOCATE: Dashboard, Child Profile, Goal Progress, Contact Log, Compliance, Legal Support, Resources
* TEACHER_THERAPIST: Dashboard (limited), Goal Progress, Behavior (ABC), Contact Log
* ADMIN: all pages

**Implementation note:** The access map is used both by route configuration and nav configuration.

---

## 3) Routing (React Router DOM) — protect every page

### 3.1 Required routes

Public:

* `/login`
* `/register`

Protected:

* `/dashboard`
* `/child-profile`
* `/iep-analyzer`
* `/goal-progress`
* `/behavior-abc`
* `/contact-log`
* `/letter-writer`
* `/advocacy-lab`
* `/compliance`
* `/legal-support`
* `/resources`
* `/settings`

Fallback:

* `*` => Not Found

### 3.2 Nested routing layout

* Wrap all protected routes inside:

  * `RequireAuth` guard
  * `AppShell` layout

* Apply `RequireRole` to role-specific routes.

Also define `/` redirect:

* If authenticated -> `/dashboard`
* Else -> `/login`

---

## 4) Guards

### 4.1 `RequireAuth`

* If not authenticated:

  * redirect to `/login?next=<pathname+search>`
* else render children.

### 4.2 `RequireRole`

* Props: `allowedRoles: Role[]`
* If authenticated but role not allowed:

  * render `AccessDeniedPage` (do not silently redirect)

---

## 5) Sidebar menu — configurable per role

Create `src/app/shell/navConfig.ts` (pure data):

Each item:

* `key`
* `label`
* `path`
* `icon` (lucide)
* `rolesAllowed: Role[]`

Required menu:

1. Dashboard
2. Child Profile
3. IEP Analyzer
4. Goal Progress
5. Behavior (ABC)
6. Contact Log
7. Letter Writer
8. Advocacy Lab
9. Compliance
10. Legal Support
11. Resources
12. Settings

**Behavior**

* Render only items allowed for current user role.
* Active state uses sidebar tokens:

  * `bg-sidebar-accent text-sidebar-accent-foreground`
* Must be responsive:

  * desktop: fixed sidebar
  * mobile: shadcn `Sheet` opened from hamburger.

---

## 6) App Shell (responsive)

### 6.1 AppShell layout requirements

* Desktop: sidebar left + topbar + content outlet
* Mobile: topbar includes hamburger to open sidebar in `Sheet`

### 6.2 Topbar requirements

* Right side:

  * notification icon (stub ok)
  * user avatar dropdown

    * shows name + role label
    * logout action

Logout must:

* clear session storage
* navigate to `/login`

---

## 7) Services (use `*.service.ts` for ALL domains)

### 7.1 Naming

* No `mock.service.ts` filenames.
* Each domain has a `*.service.ts` file.
* Implementation can return mocked data now.

### 7.2 Factory pattern (swappable later)

Each service file exports:

* interface type
* `getXService()` factory

Example pattern:

* `export interface DashboardService { getSummary(): Promise<DashboardSummary> }`
* `export function getDashboardService(): DashboardService { return impl }`

Where `impl` is a local const that currently returns mocked data (with simulated latency) but can be replaced later with fetch calls.

### 7.3 Simulated latency

In `src/shared/lib/utils.ts` (or inside each service):

* `sleep(ms)` helper
* Each service method should `await sleep(200–600ms)`.

---

## 8) Auth — service + session storage + JWT mock

### 8.1 Auth types

`src/domain/auth/types.ts`:

* `User`: `{ id, email, displayName, role }`
* `Session`: `{ token, user, expiresAt }`

### 8.2 Auth service (`auth.service.ts`)

Methods:

* `login(email, password): Promise<Session>`
* `register({email, password, displayName}): Promise<{ ok: true }>`
* Optional `refresh(token): Promise<Session>` (stub ok)

**Mock login behavior**

* return a token string that looks like a JWT: `header.payload.signature`
* role assignment based on email substring:

  * contains `advocate` -> ADVOCATE
  * contains `teacher` -> TEACHER_THERAPIST
  * contains `admin` -> ADMIN
  * else -> PARENT
* expiresAt = now + 2 hours

### 8.3 Session storage keys

* Key: `askiep.session`

---

## 9) Hook: `useSessionStorage()` (required)

Create `src/hooks/useSessionStorage.ts` modeled after the provided `useLocalStorage` example, but using `window.sessionStorage`.

**Requirements**

* Same API: `[value, setValue]`
* JSON parse/stringify
* Supports functional updates like `setValue(prev => next)`
* Handles remove when null/undefined
* Listens to `storage` events for sync across tabs (even though sessionStorage is per-tab, keep pattern consistent)

This hook must be used by AuthProvider (or auth.storage) to read/write session.

---

## 10) Theme: automatic switching provider (required)

Create `src/app/providers/ThemeProvider.tsx` using the provided code pattern:

* Initialize from `prefers-color-scheme: dark`
* Subscribe to media query change
* Toggle `.dark` on `document.documentElement`

Expose:

* `useTheme()` hook
* `ThemeProvider`

**Optional extension** (only if trivial): Add a Settings toggle that overrides auto-mode; but default behavior is auto.

---

## 11) Pages — what each page must show + service used

**All pages must:**

* call its domain service in `useEffect`
* show LoadingState while waiting
* show EmptyState for empty arrays
* use shadcn components (Card/Button/etc.)

### 11.1 LoginPage (public)

* Center card (shadcn Card)
* Inputs: email, password
* Button: Sign in
* On success: store session in sessionStorage and redirect to `next` or `/dashboard`
* Link to `/register`

### 11.2 RegisterPage (public)

* Inputs: displayName, email, password
* Button: Create account
* On success: toast + redirect to `/login`

### 11.3 DashboardPage (protected)

Service: `domain/dashboard/dashboard.service.ts`
UI:

* Hero card with headline and 2 CTA buttons:

  * Analyze New IEP -> `/iep-analyzer`
  * Advocacy Lab -> `/advocacy-lab`
* 3 cards grid:

  * Compliance Health (progress)
  * Goal Mastery summary
  * Advocacy Wisdom quote

### 11.4 ChildProfilePage (protected)

Service: `domain/child/child.service.ts`
UI:

* Header with Edit Profile button
* Cards:

  * General info
  * Disability categories
  * Advocacy bio with copy button
  * Focus tags chips

### 11.5 IEPAnalyzerPage (protected)

Service: `domain/iep/iep.service.ts`
UI:

* Dropzone + choose document
* Paste text textarea
* Perform analysis button -> displays mock summary result
* History panel

### 11.6 GoalProgressPage (protected)

Service: `domain/goals/goals.service.ts`
UI:

* List/table of goals with progress + status badges

### 11.7 BehaviorABCPage (protected)

Service: `domain/behavior/behavior.service.ts`
UI:

* ABC entries list + Add Entry dialog (stub)

### 11.8 ContactLogPage (protected)

Service: `domain/contact/contact.service.ts`
UI:

* Contact events table + Log Contact button

### 11.9 LetterWriterPage (protected)

Service: `domain/letters/letters.service.ts`
UI:

* Template picker + editable draft + Generate Draft (mock)

### 11.10 AdvocacyLabPage (protected)

Service: `domain/advocacy/advocacy.service.ts`
UI:

* Insights/action cards

### 11.11 CompliancePage (protected)

Service: `domain/compliance/compliance.service.ts`
UI:

* Checklist + timeline

### 11.12 LegalSupportPage (protected)

Service: `domain/legal/legal.service.ts`
UI:

* Plain-language resources cards

### 11.13 ResourcesPage (protected)

Service: `domain/resources/resources.service.ts`
UI:

* Categories grid

### 11.14 SettingsPage (protected)

Service: `domain/settings/settings.service.ts`
UI:

* Preferences toggles (stubs)
* Optional theme display state from ThemeProvider
* Logout button

---

## 12) Step-by-step build sequence (LLM execution plan)

**Step 1 — Create roles + types**

* Create `domain/auth/roles.ts`, `types.ts`

**Step 2 — Create session hook + auth storage**

* Implement `hooks/useSessionStorage.ts`
* Implement `domain/auth/auth.storage.ts` using the hook (or wrap functions around sessionStorage)

**Step 3 — Create auth service**

* Implement `domain/auth/auth.service.ts` with mocked async methods returning JWT-like token

**Step 4 — Create AuthProvider**

* Implement `app/providers/AuthProvider.tsx`
* Expose `useAuth()`
* Implement login/register/logout flows and redirect logic.

**Step 5 — Create ThemeProvider**

* Implement `app/providers/ThemeProvider.tsx` using provided media query approach.

**Step 6 — Create nav config**

* Implement `app/shell/navConfig.ts` with menu items + rolesAllowed.

**Step 7 — Create guards**

* Implement `RequireAuth` and `RequireRole`.

**Step 8 — Create AppShell**

* Implement responsive sidebar via `Sheet` on mobile.
* Add topbar with avatar dropdown + logout.

**Step 9 — Create services for each page**

* Create `*.service.ts` for each domain with mocked async returns.

**Step 10 — Create pages**

* Implement each page using its service.

**Step 11 — Create router**

* Implement `AppRoutes.tsx` with nested routes:

  * public routes
  * protected routes inside AppShell
  * role-protected routes with RequireRole
  * `/` redirect behavior

**Step 12 — Wire providers in App.tsx**

* Wrap app with ThemeProvider and AuthProvider.

---

## 13) UI class constraints (respect your globals.css tokens)

Use only token-driven classes:

* backgrounds: `bg-background`, `bg-card`, `bg-muted`, `bg-sidebar`
* text: `text-foreground`, `text-muted-foreground`, `text-sidebar-foreground`
* borders: `border-border`, `border-sidebar-border`

Avoid:

* `text-blue-500` / `bg-indigo-600` / any fixed palette color usage

---

## 14) Acceptance checks (LLM must verify)

* [ ] Unauthenticated: only `/login` and `/register` accessible
* [ ] Authenticated: all pages accessible based on role
* [ ] Route protection works even on manual URL entry
* [ ] Sidebar items filtered by role
* [ ] Every page calls a service file named `*.service.ts`
* [ ] Session saved in sessionStorage and cleared on logout
* [ ] Login redirect honors `next=`
* [ ] Theme auto-switch adds/removes `.dark`

---

## Appendix A — Provided code patterns (do not paste verbatim unless requested)

* `useSessionStorage` should mirror the behavior of the sample `useLocalStorage`, but use `sessionStorage`.
* ThemeProvider should follow the sample `prefers-color-scheme` listener and toggling `.dark` on `documentElement`.
