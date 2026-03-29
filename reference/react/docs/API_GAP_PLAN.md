# API Gap Plan

## Coverage Status (from apps/ui/docs/openapispec.json)
- **Implemented**: auth (login/register/profile/change-password), children, goals (+progress), behaviors, communications, letters (basic CRUD), advocacy (basic resources), compliance, resources, dashboard stats, legal resources, preferences, IEP analyze.
- **Not Implemented / Partially**:
  - Auth: refresh, logout, role-specific register (`/register/parent|advocate|teacher`).
  - IEP: CRUD (`/api/v1/iep`, `/:id`) unused in UI.
  - Letters: templates endpoints unused; template UI still local/missing.
  - Advocacy: templates unused; smart prompts not surfaced.
  - Legal: `/api/v1/legal/support` unused (support actions not wired).
  - Config: `/api/v1/config`, `/api/v1/admin/config` unused (dropdown/system data, admin edits).
  - Leads: public `/api/v1/leads` (create) and admin `/api/v1/leads` + `/stats` unused.
  - Admin: `/api/v1/admin/users*` and approve/suspend unused.
  - Auth logout/refresh flows not hooked; token retry not present.
  - AI: `/api/v1/ai/conversations`, `/api/v1/smart-prompts` unused.
  - Health: `/health` (optional).

## UI / Route vs PRD Alignment
- Menus (navConfig) include: Dashboard, Child Profile, IEP Analyzer, Goal Progress, Behavior, Contact Log, Letter Writer, Advocacy Lab, Compliance, Legal Support, Resources, Settings.
- Missing in UI vs API/PRD:
  - IEP CRUD pages (only analyzer exists).
  - Templates management (letters, advocacy) absent.
  - Admin consoles (users, leads, config) absent; nav only role-based for parent/advocate/teacher/admin but no admin-specific screens.
  - Smart Legal Prompts surfacing not implemented (PRD requires severity-coded alerts, evidence, disclaimers).
  - Logout/refresh not exposed in UI flows.
  - Lead capture (public) not in UI.
  - Config-driven dropdowns (disabilities, goal categories, states) still hardcoded; should come from `/api/v1/config`.

## Role Considerations
- Current nav restricts some routes (e.g., IEP Analyzer: Parent/Admin only; Letter Writer: Parent/Admin). Admin-only API endpoints unused; Advocate/Teacher role-specific registration not surfaced.

## Implementation Phases
1) **Auth Hardening**
   - Hook refresh + retry on 401; call `/api/v1/auth/logout` on sign-out.
   - Add role-specific register options using `/register/parent|advocate|teacher`.
2) **IEP CRUD**
   - Build IEP list/detail/create/edit pages bound to `/api/v1/iep` endpoints; keep analyze button using `/api/v1/iep/analyze`.
3) **Templates**
   - Letters: manage templates via `/api/v1/letters/templates`; allow generate-from-template flow.
   - Advocacy: fetch/use `/api/v1/advocacy/templates` where applicable.
4) **Smart Prompts**
   - Surface `/api/v1/smart-prompts` in dashboard/goal/compliance views with PRD severity badges, disclaimers, evidence links.
5) **Config-driven Options**
   - Replace hardcoded select options (disabilities, goal categories, states, advocacy levels) with `/api/v1/config`; add admin config management via `/api/v1/admin/config` (ADMIN role only).
6) **Legal Support Action**
   - Wire `/api/v1/legal/support` for requesting help; add CTA in Legal Support page.
7) **Leads**
   - Add public lead capture form to `/api/v1/leads`; admin leads list/stats pages gated to ADMIN.
8) **Admin Console**
   - Add user management (list/filter/approve/suspend/create) via `/api/v1/admin/users*` and role-guard to ADMIN.
9) **AI Conversations**
   - If in scope, build chat UI using `/api/v1/ai/conversations` (list/create) with optional child context.

## Test Outline per Phase
- Auth: login/refresh/logout; role-specific register success/fail; 401 retry.
- IEP: CRUD + analyze flows; token-required; ownership checks.
- Templates: create/update/delete templates; generate letter; persistence.
- Smart Prompts: fetch/render; severity badges; disclaimers per PRD.
- Config: dropdowns populate from API; admin updates propagate.
- Legal Support: submit support request; list support options if provided.
- Leads: public submission works unauthenticated; admin list/stats gated.
- Admin console: role enforcement; approve/suspend; new user creation.
- AI conversations: list/create messages; auth enforced.
