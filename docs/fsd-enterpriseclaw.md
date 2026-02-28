---
title: Functional Specification — EnterpriseClaw
description: User-facing feature specification for EnterpriseClaw, mapped to OpenClaw concepts, covering all pages, interactions, REST API surface, .env configuration, and Taskfile developer workflow.
author: enterpriseclaw team
date: 2026-02-28
---

# Functional Specification: EnterpriseClaw

## Table of Contents

- [1. Purpose and Scope](#1-purpose-and-scope)
- [2. OpenClaw Feature Mapping](#2-openclaw-feature-mapping)
- [3. User Personas and Operating Modes](#3-user-personas-and-operating-modes)
- [4. Application Shell and Navigation](#4-application-shell-and-navigation)
- [5. Chat Page](#5-chat-page)
- [6. Skills Page](#6-skills-page)
- [7. CronJobs Page](#7-cronjobs-page)
- [8. Observability Dashboard](#8-observability-dashboard)
- [9. Audit Log Page](#9-audit-log-page)
- [10. Settings Page](#10-settings-page)
- [11. First-Run / Onboarding Experience](#11-first-run--onboarding-experience)
- [12. REST API Surface](#12-rest-api-surface)
- [13. Developer Workflow (.env + Taskfile)](#13-developer-workflow-env--taskfile)
- [14. Acceptance Criteria Summary](#14-acceptance-criteria-summary)

---

## 1. Purpose and Scope

This document defines what EnterpriseClaw does from a user and developer perspective. It specifies the screens, interactions, API contracts, and observable behaviours that the React + Spring Boot application must provide. It is the companion to the Technical Requirements Document (`trd-enterpriseclaw.md`), which defines how the system is built.

### 1.1 What This Document Covers

- Every page in the React single-page application, including routes, components, and user flows.
- The REST API endpoints the React frontend calls, with request/response shapes.
- The `.env` variables a user or operator must supply and how they affect visible behaviour.
- The `task` commands a developer uses for every part of the development lifecycle.
- Acceptance criteria written from the user's viewpoint — what "done" means for each feature.

### 1.2 What This Document Does Not Cover

- Internal Spring AI implementation details (see TRD §4).
- Deployment infrastructure beyond what is visible to the user.
- LLM provider internals.

---

## 2. OpenClaw Feature Mapping

EnterpriseClaw reimplements the key user-facing concepts from OpenClaw but removes its CLI + messaging-platform gateway in favour of a browser-first, self-contained Spring Boot + React application. The table below maps every relevant OpenClaw concept to its EnterpriseClaw equivalent.

| OpenClaw Concept | OpenClaw Mechanism | EnterpriseClaw Equivalent | Notes |
|---|---|---|---|
| Agent Loop | Serialised per-session tool-call cycle | Spring AI `ChatClient` with advisors | No CLI; loop runs inside the Spring Boot web layer |
| SKILL.md Skills | `skills/<name>/SKILL.md` Markdown folder | `.claude/skills/<name>/SKILL.md`; loaded by `SkillsTool` | Same YAML frontmatter format; editable via web Skills page |
| SOUL.md Personality | `workspaces/<ws>/SOUL.md` | System prompt field on the Settings page; stored in DB | Displayed and editable without touching the filesystem |
| USER.md Profile | `~/.openclaw/user.md` | User profile section on the Settings page | Stored in DB per user in team mode |
| Memory | Markdown files per session in `~/.openclaw/` | Spring AI `VectorStore` + `MessageWindowChatMemory` | No raw files; searchable via Audit Log |
| Sessions | CLI `openclaw sessions` | Session sidebar in the Chat page | Persistent sessions per user; listed in the session panel |
| AskQuestion Tool | Agent pauses loop, routes question to channel | `AskUserQuestionTool`; renders question card in Chat page | Same semantics, browser-native UI instead of messaging app |
| CronJobs | `~/.openclaw/cron/jobs.json` + CLI | CronJobs page; DB-backed `ScheduledJob` entity | Full CRUD from the browser; no JSON editing required |
| Tool Permissions | `tools.allow` / `tools.deny` in `openclaw.json` | Per-skill `allowed-tools` field in `SKILL.md` frontmatter | Global defaults on Settings page |
| Browser Tool | Headless browser invoked by LLM | Forwarded to a `ShellTools` script inside a skill folder | Skill author provides the script |
| Shell Tool | `openclaw shell run` | `ShellTools` inside skill folder | Sandboxed by Docker in production |
| Multi-Agent Routing | Workspace isolation + channel bindings | Supervisor agent pattern; skill-based routing | No external messaging channels — browser only |
| Dashboard | Third-party community projects | Built-in Observability Dashboard pages | No Grafana; everything in-app |
| ClawHub Skills Marketplace | External skill registry | Planned — see Open Questions in TRD | Future feature |

---

## 3. User Personas and Operating Modes

### 3.1 Personas

| Persona | Description | Mode |
|---|---|---|
| **Solo Developer** | Single user, local machine, experimenting with agents | `solo` |
| **Power User** | Single user, server or Docker, long-running agents, scheduled tasks | `solo` |
| **Team Member** | One of many users in an organisation-shared deployment | `team` |
| **Team Admin** | Manages users, shared skills, global settings | `team` |

### 3.2 Solo Mode (`SPRING_PROFILES_ACTIVE=solo`)

- Application binds to `127.0.0.1` only.
- No login page; the application opens directly into the Chat page.
- Database is H2 embedded; data persists in `./data/` across restarts.
- All features are available to the single implicit user.
- `.env` must contain at least one LLM API key.

### 3.3 Team Mode (`SPRING_PROFILES_ACTIVE=team`)

- Application binds to `0.0.0.0` (configurable).
- Login page is the entry point; form-based authentication backed by the user table.
- First-time setup creates an admin user if none exists.
- Each user has their own sessions, cron jobs, and audit log.
- Skills in `.claude/skills/` are shared across all users; custom skills can be scoped per user (future work).
- Database is PostgreSQL; `SPRING_DATASOURCE_URL` / `_USERNAME` / `_PASSWORD` must be set in `.env`.

---

## 4. Application Shell and Navigation

### 4.1 React App Entry Point

The React SPA is served at `http://localhost:8080/`. Spring Boot's `ResourceHttpRequestHandler` serves the built `index.html` from `src/main/resources/static/`, along with all JS/CSS assets. All navigation is client-side; the server returns `index.html` for any path that is not an `/api/` route.

### 4.2 Route Map

| Route | Page | Available In |
|---|---|---|
| `/` | Redirect → `/chat` | Both modes |
| `/chat` | Chat — new session | Both modes |
| `/chat/:sessionId` | Chat — existing session | Both modes |
| `/skills` | Skills — list | Both modes |
| `/skills/new` | Skills — create | Both modes |
| `/skills/:name` | Skills — view/edit | Both modes |
| `/cronjobs` | CronJobs — list | Both modes |
| `/cronjobs/new` | CronJobs — create | Both modes |
| `/cronjobs/:id` | CronJobs — detail/edit | Both modes |
| `/dashboard` | Observability — overview | Both modes |
| `/dashboard/agent-runs` | Observability — run timeline | Both modes |
| `/dashboard/skill-usage` | Observability — skill stats | Both modes |
| `/dashboard/llm-usage` | Observability — token/cost | Both modes |
| `/dashboard/cronjob-health` | Observability — cron health | Both modes |
| `/audit-log` | Audit Log | Both modes |
| `/settings` | Settings — profile + models | Both modes |
| `/settings/users` | Settings — user management | Team mode / Admin only |
| `/login` | Login | Team mode only |

### 4.3 Navigation Sidebar

A persistent left sidebar is visible after login (or immediately in solo mode). It contains:

- **Logo** — EnterpriseClaw brand mark; clicking returns to `/chat`.
- **New Chat** button — creates a fresh session and navigates to it.
- **Session list** — scrollable list of the current user's last 50 sessions, ordered by most recent activity. Each entry shows: session title (auto-generated from the first user message), timestamp of last message, and skill icon if a skill was activated.
- **Primary nav links** — Chat, Skills, CronJobs, Dashboard, Audit Log, Settings.
- **User avatar / menu** (team mode) — name, logout.
- **Mode badge** — small chip reading "solo" or "team" in the footer area of the sidebar.

### 4.4 Top Bar

The top bar shows:

- Breadcrumb / page title.
- Active LLM model selector — dropdown populated from the models configured in `.env` / Settings; the selected model is applied to the next chat message.
- Status indicator — green/red dot reflecting the last heartbeat from the Spring Boot actuator `/actuator/health` endpoint.

---

## 5. Chat Page

The Chat page is the primary interface — it replicates OpenClaw's agentic loop in the browser.

### 5.1 Layout

```
┌─────────────────────────────────────────────────────────┐
│  SIDEBAR          │  MESSAGE THREAD                      │
│  (§4.3)           │                                      │
│                   │  [User message bubble]               │
│                   │  [Thinking indicator — spinner]      │
│                   │  [Tool call chip — e.g. code-reviewer│
│                   │   invoked]                           │
│                   │  [Question card — AskUserQuestion]   │
│                   │  [Agent response — streamed Markdown] │
│                   │                                      │
│                   ├──────────────────────────────────────│
│                   │  [Message input box + Send button]   │
│                   │  [Model selector chip] [Attach file] │
└─────────────────────────────────────────────────────────┘
```

### 5.2 Starting a Session

1. User clicks **New Chat** or navigates to `/chat`.
2. The React app calls `POST /api/v1/sessions` to create a session record.
3. The URL updates to `/chat/:sessionId`.
4. The message thread is empty; a welcome message is rendered client-side (not from the server) explaining what the agent can do.

### 5.3 Sending a Message

1. User types in the input box and presses Enter or clicks **Send**.
2. React calls `POST /api/v1/chat` with `{ sessionId, message, model }`.
3. The server responds with a **Server-Sent Events (SSE)** stream.
4. The React app renders chunks as they arrive into the message thread (streaming Markdown).
5. When the stream closes the message is finalised in the thread.

Request body:

```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Review my last commit for security issues",
  "model": "gpt-4o"
}
```

SSE event types emitted by the server:

| Event type | Payload | Rendered as |
|---|---|---|
| `token` | `{ "text": "..." }` | Appended to current response bubble |
| `tool_call` | `{ "tool": "code-reviewer", "status": "running" }` | Skill chip displayed above the response |
| `tool_done` | `{ "tool": "code-reviewer", "status": "done" }` | Chip updates to ✔ |
| `question` | `{ "questionId": "...", "text": "Which branch?" }` | Question card rendered (§5.5) |
| `done` | `{}` | Stream complete; finalise message |
| `error` | `{ "message": "..." }` | Error banner rendered |

### 5.4 Streaming Markdown Rendering

- Agent responses are streamed token-by-token.
- The React component uses incremental Markdown rendering — partial tokens are accumulated and re-rendered as a live preview.
- Code blocks are syntax-highlighted using a client-side library (e.g., Prism or highlight.js).
- Links in agent responses open in a new tab.

### 5.5 Question Cards (AskUserQuestionTool)

When the agent invokes `AskUserQuestionTool`, the stream emits a `question` event. The React app renders a **Question Card** in the message thread:

```
┌─────────────────────────────────────────┐
│ 🤔  Before I continue…                  │
│                                         │
│  Which branch should I review?          │
│                                         │
│  [Answer input box]          [Submit]   │
└─────────────────────────────────────────┘
```

- The message input box is **disabled** while a question is pending.
- The user types an answer and clicks **Submit**.
- React calls `POST /api/v1/chat/answer` with `{ sessionId, questionId, answer }`.
- The server resumes the agent loop; streaming continues.
- The question card is replaced by the submitted answer, displayed as a small user-attributed message.

### 5.6 Tool Call Visibility

Every tool invocation is shown as a collapsible chip above the agent's response:

```
▶  code-reviewer  (running…)   →   ✔  code-reviewer  (2.3 s)
```

Clicking the chip expands a detail panel showing:

- Skill name and description.
- Input passed to the skill (truncated to 500 chars).
- Files read or scripts run during execution.
- Duration and token count.

This mirrors OpenClaw's transparency about what the agent did during a run.

### 5.7 Session Title Auto-Generation

After the first assistant response, the server automatically generates a short session title (≤ 60 chars) by calling the LLM with a summarisation prompt. The title is saved via `PATCH /api/v1/sessions/:sessionId/title` and reflected immediately in the sidebar session list.

### 5.8 Session Controls

A **⋮** menu on each session item in the sidebar provides:

- **Rename** — inline text edit, saved on blur.
- **Delete** — confirmation dialog; deletes the session and its messages.
- **Export** — downloads the session as a Markdown file.

### 5.9 File Attachment

A paperclip icon in the input bar opens the browser file picker. The selected file is uploaded to `POST /api/v1/sessions/:sessionId/attachments`, and its content is injected into the next chat message as context. Maximum file size: 10 MB. Supported types: plain text, Markdown, PDF (text-extracted server-side), CSV, JSON.

---

## 6. Skills Page

The Skills page corresponds to OpenClaw's `skills/` directory management. All SKILL.md files are viewable and editable from the browser — no terminal required.

### 6.1 Skills List (`/skills`)

A card grid showing all registered skills. Each card displays:

- Skill name (slug).
- Description (first sentence).
- Source badge: **built-in** (classpath JAR), **filesystem** (`.claude/skills/`), or **user** (created in the browser).
- Last invoked timestamp and invocation count (from the database).
- Quick actions: **Edit**, **Duplicate**, **Delete** (filesystem and user skills only).

A search bar filters cards client-side by name or description keyword.

### 6.2 Skill Detail / Edit (`/skills/:name`)

Clicking a card opens the skill editor page:

```
┌────────────────────────────────────────────────────────────┐
│  ← Back to Skills                     [Save]  [Test]       │
├──────────────────┬─────────────────────────────────────────┤
│  Frontmatter     │  Instructions (Markdown editor)         │
│  ─────────────── │                                         │
│  name:           │  # Code Reviewer                        │
│  description:    │                                         │
│  allowed-tools:  │  ## Instructions                        │
│  model:          │  When reviewing code:                   │
│                  │  1. Check for security...               │
└──────────────────┴─────────────────────────────────────────┘
```

- The left panel is a structured form for YAML frontmatter fields.
- The right panel is a full-height Markdown editor (e.g., CodeMirror with Markdown mode).
- **Save** calls `PUT /api/v1/skills/:name` with the updated `SKILL.md` content.
- **Test** opens a modal with a pre-filled chat input; submitting it starts a one-shot agent run using this skill and streams the response in the modal.

### 6.3 Creating a New Skill (`/skills/new`)

Same editor layout as §6.2 but with empty fields. The **name** field auto-slugifies as the user types the description. On save, the skill is written to `.claude/skills/<name>/SKILL.md` via `POST /api/v1/skills`.

### 6.4 Skill Files (Supporting Files)

Below the editor, a **Files** panel lists all non-`SKILL.md` files in the skill folder (e.g., `reference.md`, `scripts/lint_check.py`). Actions:

- **View** — opens file content in a read-only code viewer modal.
- **Upload** — uploads a new supporting file to the skill folder.
- **Delete** — removes a supporting file.

### 6.5 Built-In Skills

The following skills ship in the default SkillsJar and are visible as **built-in** on the skills list. Users can view them but cannot edit or delete them (source is the classpath JAR):

| Skill | Description |
|---|---|
| `code-reviewer` | Reviews code for security issues, best practices, and Spring conventions |
| `web-search` | Searches the web and summarises results |
| `doc-generator` | Generates README files, API docs, and Markdown documentation |
| `data-analyst` | Analyses CSV/JSON data files and produces summaries |
| `email-drafter` | Drafts professional emails from bullet points |
| `cronjob-builder` | Creates a cron job from a natural-language schedule description |
| `pdf-processor` | Extracts and summarises text from PDF attachments |
| `api-integrator` | Calls a REST API endpoint and formats the result |

---

## 7. CronJobs Page

The CronJobs page corresponds to OpenClaw's `cron` tool and jobs.json system, elevated into a first-class browser experience.

### 7.1 CronJobs List (`/cronjobs`)

A table listing all cron jobs owned by the current user:

| Column | Description |
|---|---|
| Name | User-assigned label |
| Prompt | First 80 chars of the job's stored prompt |
| Schedule | Human-readable form of the cron expression (e.g., "Every Monday at 8 AM") |
| Status | Enabled / Disabled |
| Last Run | Timestamp + ✔/✘ outcome |
| Next Run | Calculated next fire time |
| Actions | Edit, Trigger Now, Enable/Disable, Delete |

A **+ New Job** button navigates to `/cronjobs/new`.

### 7.2 Creating a CronJob (`/cronjobs/new`)

Form fields:

| Field | Type | Description |
|---|---|---|
| Name | Text | Human-readable label |
| Prompt | Textarea | The agent instruction run on each trigger |
| Schedule | Cron builder | Visual cron expression builder (dropdowns for common presets + free-text for advanced) |
| Model | Dropdown | Override the default model for this job |
| Question context | Toggle | If enabled, the agent may ask a question before running; the answer is stored and replayed on subsequent runs unless explicitly reset |
| Session target | Toggle | **Isolated** (new session per run, default) or **Main** (append to the user's primary session) |

On **Save**, calls `POST /api/v1/cronjobs`. The job is registered with the Spring `TaskScheduler` immediately.

### 7.3 CronJob Detail (`/cronjobs/:id`)

Shows the job configuration (editable) plus a **Execution History** tab:

- Paginated table of past executions with columns: run time, duration, status, skill activated, tokens used.
- Clicking a row expands the full agent response for that run.
- A **Trigger Now** button forces an immediate run outside the schedule.

### 7.4 Natural-Language Schedule

If the user types a natural-language phrase in the Schedule field (e.g., "every weekday at 9 AM"), a `POST /api/v1/cronjobs/parse-schedule` call translates it to a cron expression on the fly using the LLM and fills in the cron builder. The user can accept or edit the result.

### 7.5 CronJob Question Context Flow

If **Question context** is enabled on a job:

1. When the job fires, the agent may invoke `AskUserQuestionTool`.
2. A notification badge appears on the **CronJobs** nav item.
3. Navigating to the job detail page shows the pending question card (same UI as §5.5).
4. The user answers; the run resumes.
5. The answer is stored per-job and replayed automatically on the next run unless the user resets it.

---

## 8. Observability Dashboard

The Dashboard gives users visibility into what the agent has been doing — equivalent to what OpenClaw community dashboards provide externally, but built into the app.

### 8.1 Dashboard Overview (`/dashboard`)

Summary cards with sparklines:

| Card | Metric | Period |
|---|---|---|
| Agent Runs | Total runs today / this week | Last 7 days |
| Tokens Used | Prompt + completion tokens | Last 7 days |
| Estimated Cost | USD, based on published model pricing | Last 7 days |
| Skills Activated | Top 3 skills by invocation count | Last 7 days |
| CronJob Health | % of scheduled jobs that ran successfully | Last 7 days |
| Pending Questions | Count of unanswered `AskUserQuestion` items | Current |

Clicking any card navigates to the corresponding detail page.

### 8.2 Agent Runs Timeline (`/dashboard/agent-runs`)

A chronological timeline of all agent interactions:

| Column | Description |
|---|---|
| Time | Timestamp |
| Session | Session title link |
| Trigger | User message (chat) or job name (cron) |
| Skill | Skill activated, if any |
| Model | Model used |
| Tokens | Prompt + completion |
| Duration | Wall-clock time |
| Status | Success / Error |

Filters: date range, session, skill, model, status.

Clicking a row expands the full message pair (user prompt + agent response).

### 8.3 Skill Usage (`/dashboard/skill-usage`)

Bar chart + table showing per-skill statistics:

| Column | Description |
|---|---|
| Skill | Name and description |
| Invocations | Total calls |
| Last Used | Timestamp |
| Avg Duration | Mean wall-clock time per invocation |
| Error Rate | % of invocations that ended in error |
| Avg Tokens | Mean tokens consumed |

Clicking a skill name opens a filtered Agent Runs view for that skill.

### 8.4 LLM Usage (`/dashboard/llm-usage`)

Stacked bar chart (per model) + table:

| Column | Description |
|---|---|
| Date | Day |
| Model | Provider + model name |
| Prompt Tokens | Total |
| Completion Tokens | Total |
| Total Tokens | Sum |
| Estimated Cost | USD |

A **daily total** row summarises each day. A **monthly total** is shown at the top. Model pricing is configurable in Settings (per-token rates stored in the DB).

### 8.5 CronJob Health (`/dashboard/cronjob-health`)

Table of all cron jobs with health indicators:

| Column | Description |
|---|---|
| Job Name | Link to `/cronjobs/:id` |
| Schedule | Human-readable |
| Last Run | Timestamp + outcome icon |
| Next Run | Calculated |
| Success Rate | % over last 30 runs |
| Missed Runs | Count of runs that did not fire within ±30 s of scheduled time |
| Consecutive Failures | Current streak of failed runs |

A job with ≥ 3 consecutive failures is highlighted in red.

---

## 9. Audit Log Page

The Audit Log is an immutable, searchable record of every agent action — the equivalent of OpenClaw's per-agent activity logs, surfaced in a first-class UI.

### 9.1 Audit Log List (`/audit-log`)

A paginated table (50 rows per page):

| Column | Description |
|---|---|
| Time | Timestamp |
| User | (team mode) User who triggered the event |
| Event Type | `chat_message`, `skill_invoked`, `question_asked`, `question_answered`, `cron_triggered`, `skill_created`, `skill_deleted`, `login`, `settings_changed` |
| Details | Summary — e.g., skill name, question text, setting key |
| Session | Link to session (for chat events) |

Filters:

- Date range picker.
- Event type multi-select.
- Free-text search across the details column.
- User filter (team mode only).

### 9.2 Audit Event Detail

Clicking a row opens a side panel showing:

- Full event payload (JSON, formatted).
- Input and output token counts (for LLM events).
- Skill name and base directory (for skill invocation events).
- Question text and answer (for question events).
- Duration and model used.

### 9.3 Export

A **Download CSV** button exports the current filtered view to a CSV file via `GET /api/v1/audit-log/export?{filters}`.

---

## 10. Settings Page

The Settings page exposes the configuration that `.env` provides at deploy time, plus per-user preferences.

### 10.1 Settings — Profile (`/settings`)

Available in both modes:

| Field | Description |
|---|---|
| Display Name | User's full name (stored in DB) |
| Timezone | Used for cron job schedule display and next-run calculations |
| Default Model | The model pre-selected in the chat input |
| System Prompt | The agent's personality / "soul" — equivalent to OpenClaw's `SOUL.md`. Multi-line text area. |
| Default Tool Permissions | Global allow/deny for `FileSystemTools` and `ShellTools`. Dropdowns: Always Allow / Always Ask / Always Deny |

### 10.2 Settings — Model Keys (`/settings`)

A collapsible section listing all configured LLM providers:

| Provider | Status | API Key |
|---|---|---|
| OpenAI | ✔ Configured | `sk-...••••` (last 4 shown) |
| Anthropic | ✔ Configured | `sk-ant-...••••` |
| Azure OpenAI | ✘ Not configured | [+ Configure] |
| Google Gemini | ✘ Not configured | [+ Configure] |

Clicking **+ Configure** or the edit icon opens an inline form to enter the API key. The key is sent to `PUT /api/v1/settings/model-keys/:provider` and stored in the database (encrypted at rest in team mode). In solo mode the canonical source of truth remains `.env`; the UI shows a read-only view of which keys are active.

> **Solo mode note**: In solo mode, model keys are read from `.env` at startup and are displayed as read-only. The Settings page shows a banner: "Model keys are configured via your `.env` file. Restart the application after changes."

### 10.3 Settings — User Management (`/settings/users`) — Team Mode Only

Visible to admin users only:

- List of all registered users (name, email, role, last login).
- **Invite User** button — sends an invitation email (or displays an invite link in solo-SMTP-disabled mode).
- **Change Role** — toggle between `user` and `admin`.
- **Deactivate** / **Delete** user.
- A user's sessions and cron jobs are **not** deleted when the user is deactivated; they are preserved and re-assignable by an admin.

### 10.4 Settings — Skill Directories

A read-only panel showing the skill scan paths registered at startup:

```
● Classpath: classpath:.claude/skills      (built-in, 8 skills)
● Filesystem: ./.claude/skills              (user, 2 skills)
```

A **Rescan** button calls `POST /api/v1/skills/rescan` to reload all skills without restarting the application.

---

## 11. First-Run / Onboarding Experience

### 11.1 Solo Mode First Run

When the application starts for the first time (no skills invoked yet, no sessions exist):

1. The browser opens at `http://localhost:8080/chat`.
2. A **Welcome Banner** is shown at the top of the chat thread:
   > 👋 Welcome to EnterpriseClaw! I'm your AI agent powered by Spring AI.
   > To get started, type a message below — or try one of the example prompts.
3. Three **Example Prompt** chips are shown beneath the welcome message:
   - "Review my last Java commit for security issues"
   - "Schedule a weekly summary report every Monday at 9 AM"
   - "Explain how the SkillsTool works"
4. If no LLM API key is configured (`.env` missing or empty), a **Configuration Warning** banner is shown:
   > ⚠️  No LLM provider API key is configured. Add `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` to your `.env` file and restart.
5. Clicking an example prompt populates the input box; the user can edit and send.

### 11.2 Team Mode First Run

1. The application redirects to `/login`.
2. If no users exist in the database (first-ever startup), a **Setup Wizard** page is shown at `/setup`:
   - Step 1: Create the admin user (name, email, password).
   - Step 2: Select default LLM provider and enter the API key (or skip to configure via `.env`).
   - Step 3: Review — shows a summary and a **Launch** button.
3. After setup, the admin is logged in and sees the Chat page with the welcome banner.

### 11.3 Skill Health Check

On every startup, the application logs (and surfaces in the Settings → Skill Directories panel) any `SKILL.md` files that fail YAML front-matter validation. Invalid skills are displayed with a warning badge on the Skills list page but do not prevent the application from starting.

---

## 12. REST API Surface

The following endpoints are consumed by the React frontend. All paths are prefixed with `/api/v1`. All responses are `application/json` unless noted.

### 12.1 Sessions

| Method | Path | Description |
|---|---|---|
| `GET` | `/sessions` | List all sessions for current user (id, title, last-message-at) |
| `POST` | `/sessions` | Create new session; returns `{ sessionId, createdAt }` |
| `PATCH` | `/sessions/:id/title` | Update session title |
| `DELETE` | `/sessions/:id` | Delete session and all its messages |
| `GET` | `/sessions/:id/export` | Export session as Markdown (Content-Type: text/markdown) |

### 12.2 Chat

| Method | Path | Description |
|---|---|---|
| `POST` | `/chat` | Send message; returns SSE stream (Content-Type: text/event-stream) |
| `POST` | `/chat/answer` | Submit answer to a pending `AskUserQuestion`; resumes SSE stream |

### 12.3 Skills

| Method | Path | Description |
|---|---|---|
| `GET` | `/skills` | List all skills with metadata |
| `GET` | `/skills/:name` | Get full SKILL.md content + file list |
| `POST` | `/skills` | Create new skill (writes SKILL.md to filesystem) |
| `PUT` | `/skills/:name` | Update SKILL.md content |
| `DELETE` | `/skills/:name` | Delete skill folder (filesystem/user skills only) |
| `POST` | `/skills/rescan` | Reload skill registry without restart |
| `GET` | `/skills/:name/files` | List supporting files in skill folder |
| `POST` | `/skills/:name/files` | Upload supporting file |
| `DELETE` | `/skills/:name/files/:filename` | Delete supporting file |

### 12.4 CronJobs

| Method | Path | Description |
|---|---|---|
| `GET` | `/cronjobs` | List all cron jobs for current user |
| `GET` | `/cronjobs/:id` | Get job detail |
| `POST` | `/cronjobs` | Create cron job |
| `PUT` | `/cronjobs/:id` | Update job (prompt, schedule, model, etc.) |
| `POST` | `/cronjobs/:id/trigger` | Trigger job immediately |
| `POST` | `/cronjobs/:id/enable` | Enable job |
| `POST` | `/cronjobs/:id/disable` | Disable job |
| `DELETE` | `/cronjobs/:id` | Delete job |
| `GET` | `/cronjobs/:id/history` | Paginated execution history |
| `POST` | `/cronjobs/parse-schedule` | Translate natural language → cron expression via LLM |

### 12.5 Observability

| Method | Path | Description |
|---|---|---|
| `GET` | `/dashboard/summary` | Cards data for overview page |
| `GET` | `/dashboard/agent-runs` | Paginated agent run timeline |
| `GET` | `/dashboard/skill-usage` | Skill stats table |
| `GET` | `/dashboard/llm-usage` | Token/cost table by date + model |
| `GET` | `/dashboard/cronjob-health` | CronJob health table |

### 12.6 Audit Log

| Method | Path | Description |
|---|---|---|
| `GET` | `/audit-log` | Paginated audit log with filter params |
| `GET` | `/audit-log/export` | CSV export of filtered view |

### 12.7 Settings

| Method | Path | Description |
|---|---|---|
| `GET` | `/settings/profile` | Get current user profile |
| `PUT` | `/settings/profile` | Update profile (name, timezone, default model, system prompt, tool permissions) |
| `GET` | `/settings/model-keys` | List configured providers + masked key status |
| `PUT` | `/settings/model-keys/:provider` | Set/update API key for provider |
| `GET` | `/settings/users` | List all users (admin only) |
| `POST` | `/settings/users/invite` | Invite user (admin only) |
| `PUT` | `/settings/users/:id/role` | Change user role (admin only) |
| `POST` | `/settings/users/:id/deactivate` | Deactivate user (admin only) |

### 12.8 Attachments

| Method | Path | Description |
|---|---|---|
| `POST` | `/sessions/:id/attachments` | Upload file; returns `{ attachmentId, filename, extractedText }` |
| `DELETE` | `/sessions/:id/attachments/:attachmentId` | Remove attachment before sending |

### 12.9 Auth (Team Mode)

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/login` | Form login; sets session cookie |
| `POST` | `/auth/logout` | Invalidate session |
| `GET` | `/auth/me` | Current user info (used by React on app load) |
| `POST` | `/setup` | First-time admin creation (only available before any user exists) |

### 12.10 Common Response Shape

All paginated list endpoints accept `?page=0&size=50` and return:

```json
{
  "content": [...],
  "page": 0,
  "size": 50,
  "totalElements": 312,
  "totalPages": 7
}
```

All error responses return:

```json
{
  "status": 400,
  "error": "Bad Request",
  "message": "name must be lowercase alphanumeric with hyphens only",
  "path": "/api/v1/skills"
}
```

---

## 13. Developer Workflow (.env + Taskfile)

This section describes the day-to-day workflow for contributors and power users who build or run EnterpriseClaw locally. It is the user-facing counterpart to the technical Taskfile spec in TRD §9.3 and §9.4.

### 13.1 Initial Setup (New Contributor)

```bash
# 1. Clone
git clone https://github.com/enterpriseclaw/enterpriseclaw.git
cd enterpriseclaw

# 2. Copy the environment template and fill in at least one API key
cp .env.example .env
# Edit .env: set OPENAI_API_KEY or ANTHROPIC_API_KEY

# 3. Install frontend dependencies
task install

# 4. Start both frontend and backend in watch mode
task dev
# → React dev server: http://localhost:5173  (hot-reload)
# → Spring Boot:      http://localhost:8080  (auto-restart via devtools)
```

### 13.2 `.env.example` Reference

Every variable is documented in `.env.example` with a one-line comment:

```bash
# .env.example — copy to .env, never commit .env

# ── Required: at least one LLM provider ──────────────────────────────
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# ── Team mode database (only needed with SPRING_PROFILES_ACTIVE=team) ─
DB_PASSWORD=changeme
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/enterpriseclaw
SPRING_DATASOURCE_USERNAME=ec

# ── Application behaviour ─────────────────────────────────────────────
SPRING_PROFILES_ACTIVE=solo        # solo | team
SERVER_PORT=8080
ENTERPRISECLAW_SKILLS_DIR=.claude/skills   # path to skills directory

# ── Optional: default model selection ─────────────────────────────────
ENTERPRISECLAW_DEFAULT_MODEL=gpt-4o
```

### 13.3 Taskfile Command Reference

| Command | When to use |
|---|---|
| `task install` | After cloning or after updating `package.json` |
| `task dev` | Daily development — runs both servers in watch mode |
| `task dev:frontend` | Frontend-only work (requires backend already running) |
| `task dev:backend` | Backend-only work (API testing, no UI needed) |
| `task build` | Before committing — verifies the full build works end-to-end |
| `task test` | Run all tests: Vitest (frontend) + Gradle JUnit (backend) |
| `task lint` | Check code style before pushing |
| `task jlink` | Build a self-contained distribution for release |
| `task clean` | Remove all build artefacts and start fresh |

### 13.4 Frontend Development Notes

- Vite's proxy forwards `/api/*` requests to `http://localhost:8080` — the React dev server and Spring Boot work together without CORS configuration.
- Hot Module Replacement (HMR) is active on all React components; saving a file updates the browser instantly.
- Environment variables used by the React app (e.g., a feature flag) must be prefixed with `VITE_` and added to `.env`. They are embedded at build time by Vite.
- `task build:frontend` copies `frontend/dist/` into `src/main/resources/static/`. The `src/main/resources/static/` directory is `.gitignore`d and always regenerated.

### 13.5 Building for Production

```bash
task build
# 1. npm run build  → frontend/dist/
# 2. cp frontend/dist/ → src/main/resources/static/
# 3. ./gradlew build   → build/libs/enterpriseclaw-*.jar

java -jar build/libs/enterpriseclaw-*.jar
# → Open http://localhost:8080
```

The JAR is fully self-contained: it includes the React production build. No separate Node.js runtime is needed to run it.

---

## 14. Acceptance Criteria Summary

The following criteria define what "done" means for each major feature. Each criterion is written from the user's perspective.

### 14.1 Chat

- [ ] A user can send a message and see a streamed response appear token-by-token.
- [ ] A user can see which skill was activated during a response, with the skill name shown as a collapsible chip.
- [ ] When the agent asks a question, the message input is disabled and a question card is shown. The user can answer it and the response stream resumes.
- [ ] Sessions persist across browser refreshes. Reloading `/chat/:sessionId` restores the full message history.
- [ ] A user can delete, rename, and export a session from the sidebar.
- [ ] A user can attach a text or PDF file and have its content included as context.

### 14.2 Skills

- [ ] A user can view all registered skills in a searchable card grid.
- [ ] A user can create a new skill by filling in a form and editing Markdown instructions; the skill is available for the next chat message without restarting the app.
- [ ] A user can edit an existing filesystem skill from the browser and save it; the updated skill is used on the next invocation.
- [ ] A user can upload supporting files (e.g., a reference doc) to a skill folder from the browser.
- [ ] Built-in skills (classpath JAR) are visible but not editable; the UI communicates this clearly.
- [ ] The **Test** button for a skill opens a modal and runs the skill against a test prompt, streaming the result.

### 14.3 CronJobs

- [ ] A user can create a cron job with a natural-language or explicit cron expression; the job fires at the correct time.
- [ ] A user can trigger a job manually from the UI and see the result in the execution history.
- [ ] If a job produces a `AskUserQuestion`, a notification badge appears and the user can answer it from the job detail page.
- [ ] A user can view the full execution history for a job, including the agent response for each run.
- [ ] Disabling a job prevents it from firing; re-enabling it resumes the schedule.

### 14.4 Dashboard

- [ ] The overview page shows summary cards updated in real time (within 30 seconds of a run completing).
- [ ] The Agent Runs timeline is filterable by date, skill, model, and status.
- [ ] The LLM Usage page shows a daily breakdown of token counts and estimated cost per model.
- [ ] A job with ≥ 3 consecutive failures is highlighted in red on the CronJob Health page.

### 14.5 Audit Log

- [ ] Every `chat_message`, `skill_invoked`, and `question_answered` event is recorded in the audit log.
- [ ] The audit log is searchable by free text, date range, and event type.
- [ ] A user can export the filtered audit log to CSV.

### 14.6 Settings

- [ ] In solo mode, a banner on the Settings page explains that model keys come from `.env`.
- [ ] A user can update their system prompt (SOUL equivalent) and the new prompt is used on the next chat message.
- [ ] In team mode, an admin can invite a new user and see them appear in the user list after they accept.

### 14.7 Onboarding

- [ ] On first run (solo mode, no API key set), the Chat page shows a configuration warning with clear instructions to edit `.env`.
- [ ] On first run (team mode, no users in DB), the setup wizard creates an admin account and the user lands on the Chat page after completing it.
- [ ] Example prompt chips appear on the Chat page when there are no prior sessions.

### 14.8 Developer Workflow

- [ ] `task install && task dev` starts both the frontend and backend without errors on a freshly cloned repo (after `.env` is populated).
- [ ] `task build` produces a runnable JAR that serves the React UI at `http://localhost:8080/`.
- [ ] `task test` passes all Vitest and Gradle tests.
- [ ] `task clean && task build` succeeds without leftover artefacts from a previous build.
