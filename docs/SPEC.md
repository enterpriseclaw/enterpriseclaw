# EnterpriseClaw — Product & Technical Specification

> **OpenClaw reimplemented in Java/Spring Boot. Browser-first. Runs standalone or as a team server.**

**Version:** 1.0-draft  
**Date:** 2026-03-27  
**Stack:** Spring Boot 4 · Spring AI 2.0 · React 19 · H2/PostgreSQL

---

## 1. Vision

EnterpriseClaw is a browser-first AI agentic platform. A developer downloads one binary, runs it,
opens a browser, and has a personal AI agent that can read/write files, run shell commands, load
skills, connect to MCP servers, and answer questions interactively — all governed by configurable
policies.

When deployed as a team server, it adds user management, approved skill registries, model
restrictions, audit logging, and centralized SOUL.md management.

**One codebase. One Spring Boot app. Mode selected by profile.**

---

## 2. Deployment Modes

| Mode | Profile | Database | Auth | Use Case |
|------|---------|----------|------|----------|
| **Solo** | `--spring.profiles.active=solo` | H2 (file) | None (single user) | Developer laptop |
| **Server** | `--spring.profiles.active=server` | PostgreSQL | JWT / OAuth | Team deployment |

### Distribution

| Artifact | How | Target |
|----------|-----|--------|
| **Solo binary** | JLink custom runtime image | macOS/Linux/Windows — one download, no JDK needed |
| **Server** | Docker image / JLink | `docker-compose up` or bare-metal |

Both modes share the same Spring Boot application. The profile activates/deactivates beans:
- Solo: enables FileSystemTools, ShellTools, local skill scanning, H2
- Server: enables PolicyAdmin, UserManagement, SkillApproval, AuditDashboard, PostgreSQL

---

## 3. LLM Providers

### Supported Providers

| Provider | Spring AI Starter | Config Property Prefix | Notes |
|----------|-------------------|------------------------|-------|
| **OpenAI** | `spring-ai-starter-model-openai` | `spring.ai.openai.*` | GPT-4.1, GPT-5, o-series |
| **Anthropic** | `spring-ai-starter-model-anthropic` | `spring.ai.anthropic.*` | Claude 4.x (Opus, Sonnet, Haiku) |
| **GitHub Models** | `spring-ai-starter-model-openai` | `spring.ai.openai.*` | OpenAI-compatible endpoint |
| **Ollama** | `spring-ai-starter-model-ollama` | `spring.ai.ollama.*` | Local models (Llama, Mistral, etc.) |

### GitHub Models / Copilot Integration

GitHub Models API (`https://models.github.ai/inference/`) is **fully OpenAI-compatible**. Spring AI
uses it by pointing the OpenAI starter at GitHub's endpoint:

```yaml
# application-github.yml
spring:
  ai:
    openai:
      api-key: ${GITHUB_PAT}
      base-url: https://models.github.ai/inference/
      chat:
        options:
          model: openai/gpt-4.1
```

**Supported GitHub Models:** GPT-4.1, GPT-5, Claude 4 Sonnet, Llama 4, DeepSeek-R1, Mistral Large,
and 50+ others — all via a GitHub Personal Access Token (PAT) with `models` scope.

**No separate Copilot SDK needed.** GitHub Models gives us the same model access through a standard
REST API that Spring AI already supports.

### Provider Selection (Runtime)

Users select their provider in Settings or per-chat:
- **Solo:** User configures their own API keys (OpenAI, Anthropic, GitHub PAT, or local Ollama)
- **Server:** Admin configures allowed providers and model restrictions; users select from approved list

---

## 4. Policy Engine — Always On

> **Policy is NOT a server-only feature.** Policy enforcement runs in ALL modes.

### Policy Profiles (from OpenClaw)

| Profile | Description | Tools Allowed |
|---------|-------------|---------------|
| `minimal` | Read-only, no file/shell access | Chat, knowledge lookup |
| `coding` | File read/write, shell execution | FileSystem, Shell, Skills |
| `full` | Everything including admin tools | All tools + cron, MCP management |

### Policy Configuration (`enterpriseclaw.yml`)

```yaml
policy:
  default-profile: coding           # Default for solo mode
  
  tools:
    allow: []                        # Explicit allow list (empty = allow all in profile)
    deny: []                         # Explicit deny list
    owner-only:                      # Require owner identity
      - cron_manage
      - shell_execute
      - mcp_configure
  
  skills:
    allow: []
    deny: []
  
  models:
    allow:                           # Allowed models (empty = all)
      - openai/gpt-4.1
      - anthropic/claude-4-sonnet
    deny: []                         # Blocked models
    default: openai/gpt-4.1
  
  guardrails:
    max-tokens-per-request: 100000
    max-tool-calls-per-turn: 20
    max-session-depth: 50            # Message limit per session
    require-confirmation:            # Tools that need user confirmation before execution
      - shell_execute
      - file_write
```

### Policy Resolution Order

```
Request → Per-User Policy → Per-Role Policy → Global Policy → Profile Defaults
```

### Solo vs Server Policy

| Capability | Solo | Server |
|------------|------|--------|
| Policy engine active | ✅ Yes | ✅ Yes |
| Configurable profiles | ✅ Local `enterpriseclaw.yml` | ✅ Admin UI + DB |
| Tool allow/deny | ✅ | ✅ |
| Model restrictions | ✅ | ✅ |
| Guardrails (token limits, confirmation) | ✅ | ✅ |
| Per-user/per-role policies | ❌ (single user) | ✅ |
| Policy audit trail | ❌ | ✅ |
| Admin override | ❌ | ✅ |

---

## 5. Core Architecture

### Agent Loop

```
User Message
    │
    ▼
┌─────────────────────────────────────────────────┐
│  ChatService                                    │
│  1. Load session history                        │
│  2. Load SOUL.md as system prompt               │
│  3. Build tool catalog (skills + MCP + builtins)│
│  4. Apply policy filter on tools                │
│  5. Call ChatClient.prompt() with streaming      │
│  6. Stream tokens → NDJSON events               │
│  7. Handle tool_use → execute → return result   │
│  8. Handle question → AskUserQuestionTool       │
│  9. Persist messages to session                 │
│  10. Audit log                                  │
└─────────────────────────────────────────────────┘
    │
    ▼
NDJSON Stream → React UI
```

### NDJSON Event Types

```json
{"type":"token",       "text":"Hello "}
{"type":"thinking",    "text":"Let me analyze..."}
{"type":"tool_call",   "tool":"file_read", "input":{"path":"src/main.java"}}
{"type":"tool_result", "tool":"file_read", "output":"...file content..."}
{"type":"tool_done",   "tool":"file_read"}
{"type":"question",    "questionId":"q1", "text":"Which branch?", "options":["main","develop"]}
{"type":"done",        "usage":{"promptTokens":150,"completionTokens":80}}
{"type":"error",       "message":"Rate limit exceeded"}
```

### Spring AI Integration

```java
@Service
public class AgentChatService implements ChatService {

    private final ChatClient chatClient;
    private final SkillsTool skillsTool;
    private final AskUserQuestionTool askUserTool;
    private final TodoWriteTool todoTool;
    private final PolicyEngine policyEngine;
    private final SoulLoader soulLoader;

    public Flux<ChatEvent> chat(ChatRequest request) {
        var tools = buildToolCatalog(request);          // Skills + MCP + builtins
        var filtered = policyEngine.filter(tools);       // Apply policy
        var soul = soulLoader.load();                    // SOUL.md content
        
        return chatClient.prompt()
            .system(soul)
            .user(request.message())
            .tools(filtered)
            .advisors(new MessageChatMemoryAdvisor(sessionMemory))
            .stream()
            .chatResponse()
            .map(this::toChatEvent);
    }
}
```

---

## 6. SOUL.md — Agent Personality

SOUL.md is a markdown file that defines the agent's personality, boundaries, and behavioral rules.
It is loaded as the system prompt for every LLM call.

### Location
- **Solo:** `~/.enterpriseclaw/SOUL.md` or project-local `.enterpriseclaw/SOUL.md`
- **Server:** Managed via Admin UI, stored in database, versioned

### Format

```markdown
---
name: "Claw"
emoji: "🦀"
---

## Who You Are
You are Claw, an AI development assistant. You are direct, technically precise,
and genuinely helpful.

## Core Principles
- Be resourceful before asking — try to solve it yourself first
- Have opinions — suggest the better approach, don't just list options
- Be concise when the answer is simple, thorough when it matters
- Earn trust through competence, not compliance

## Boundaries
- Never execute destructive commands without confirmation
- Keep private data private — don't send code to external services
- Ask before acting on external systems (git push, API calls, etc.)
- Don't send half-baked messages — think before responding

## Technical Preferences
- Prefer composition over inheritance
- Write tests alongside code, not after
- Use the project's existing patterns, don't introduce new ones
```

### Loading Priority
1. Project-local `.enterpriseclaw/SOUL.md` (if exists)
2. User-level `~/.enterpriseclaw/SOUL.md`
3. Server-managed SOUL.md (team mode)
4. Built-in default SOUL.md

---

## 7. Skills System

Skills are modular folders of instructions that the AI agent discovers and loads on demand via
the `SkillsTool` from `spring-ai-agent-utils`.

### SKILL.md Format

```markdown
---
name: git-operations
description: "Git repository operations — commit, branch, merge, rebase"
tools: [shell_execute, file_read]
---

## When to Use
- User asks about git operations
- Need to commit, branch, merge, or rebase

## When NOT to Use
- User is asking about GitHub API (use github skill instead)

## Instructions
1. Always check `git status` before making changes
2. Use conventional commit messages
3. Never force push to main/master

## Common Commands
- `git status` — Check working tree
- `git diff --staged` — Review staged changes
- `git log --oneline -20` — Recent history
```

### Skill Discovery

```
~/.enterpriseclaw/skills/          # User-level skills
.enterpriseclaw/skills/            # Project-local skills
<server>/approved-skills/          # Team-approved skills (server mode)
```

The `SkillsTool` scans these directories, reads SKILL.md frontmatter, and presents skill
descriptions to the LLM. When the LLM selects a skill, the full SKILL.md content is loaded
into context.

### Built-in Skills (shipped with EnterpriseClaw)

| Skill | Description | Tools Used | Solo | Server |
|-------|-------------|------------|------|--------|
| `file-operations` | Read, write, search files | FileSystemTools | ✅ | ❌ |
| `shell` | Execute shell commands | ShellTools | ✅ | ❌ |
| `git-operations` | Git workflow | ShellTools | ✅ | ❌ |
| `web-search` | Search the web | MCP (Brave/Tavily) | ✅ | ✅ |
| `knowledge` | Query indexed documents | Vector Store | ✅ | ✅ |
| `cron-management` | Schedule background tasks | CronService | ✅ | ✅ |

### Server Skill Governance

In server mode, admins can:
- **Approve/deny skills** for team use
- **Curate a skill catalog** (upload SKILL.md files)
- **Restrict skill tools** (e.g., allow `git-operations` but deny `shell` tools within it)

---

## 8. MCP (Model Context Protocol) Integration

EnterpriseClaw supports connecting to external MCP servers for additional tool capabilities.

### Configuration (`enterpriseclaw.yml`)

```yaml
mcp:
  servers:
    filesystem:
      command: "npx"
      args: ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/workspace"]
      transport: stdio
    
    brave-search:
      command: "npx"
      args: ["-y", "@modelcontextprotocol/server-brave-search"]
      transport: stdio
      env:
        BRAVE_API_KEY: ${BRAVE_API_KEY}
    
    remote-server:
      url: "https://mcp.example.com/sse"
      transport: sse
```

### Architecture

```
Agent (Spring AI ChatClient)
    │
    ├── Built-in Tools (File, Shell, Cron, etc.)
    ├── Skills (SkillsTool → SKILL.md)
    └── MCP Tools (spring-ai-mcp-client)
        ├── stdio servers (local processes)
        └── SSE servers (remote HTTP)
```

Spring AI's `spring-ai-starter-mcp-client` handles:
- Spawning stdio MCP servers as child processes
- Connecting to SSE/HTTP MCP servers
- Converting MCP tool definitions to Spring AI `@Tool` format
- Unified tool catalog for the ChatClient

### MCP Server Management UI

- **Solo:** Configure via `enterpriseclaw.yml` or Settings page
- **Server:** Admin UI to manage approved MCP server catalog

---

## 9. Interactive Questions (AskUserQuestionTool)

When the agent needs user input, it uses `AskUserQuestionTool` from `spring-ai-agent-utils`.

### Flow

```
Agent → "I need to know which branch" → AskUserQuestionTool
    │
    ▼
NDJSON Event: {"type":"question", "questionId":"q1", "text":"Which branch?", "options":["main","develop"]}
    │
    ▼
React UI renders QuestionCard with buttons
    │
    ▼
User clicks "main" → POST /api/v1/chat/answer {questionId:"q1", answer:"main"}
    │
    ▼
CompletableFuture completes → Agent continues with "main"
```

### Implementation

```java
// Web-based QuestionHandler (not console-based)
public class WebQuestionHandler implements QuestionHandler {
    private final Map<String, CompletableFuture<String>> pending = new ConcurrentHashMap<>();

    @Override
    public String askQuestion(String questionId, String question, List<String> options) {
        var future = new CompletableFuture<String>();
        pending.put(questionId, future);
        // NDJSON event emitted by ChatService
        return future.get(5, TimeUnit.MINUTES);  // Wait for user answer
    }

    public void submitAnswer(String questionId, String answer) {
        pending.get(questionId).complete(answer);
    }
}
```

---

## 10. Session Management

### Session Model

```java
public record Session(
    String id,
    String userId,
    String title,
    String model,              // Model used for this session
    String provider,           // Provider override
    SessionStatus status,      // ACTIVE, ARCHIVED
    Instant createdAt,
    Instant lastMessageAt
);
```

### Message Storage

Messages are stored in the database (H2 for solo, PostgreSQL for server) with full conversation
history including tool calls and results.

```java
public record ChatMessage(
    String id,
    String sessionId,
    MessageRole role,          // USER, ASSISTANT, SYSTEM, TOOL
    String content,
    String toolCallId,         // For tool results
    String toolName,           // For tool calls
    Instant createdAt
);
```

### Session API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/sessions` | GET | List sessions (paginated) |
| `/api/v1/sessions` | POST | Create new session |
| `/api/v1/sessions/:id` | DELETE | Delete session |
| `/api/v1/sessions/:id/title` | PATCH | Update session title |
| `/api/v1/sessions/:id/export` | GET | Export session as JSON |
| `/api/v1/chat` | POST | Stream chat (NDJSON) |
| `/api/v1/chat/answer` | POST | Submit answer to question |

---

## 11. CronJobs (Background Tasks)

### Job Model

```java
public record CronJob(
    String id,
    String userId,
    String name,
    String prompt,             // Task description for the agent
    String cronExpression,     // Standard cron expression
    String model,              // Model to use
    boolean enabled,
    int maxRetries,
    Instant lastRunAt,
    Instant nextRunAt
);
```

### How It Works

1. User creates a cron job: "Every morning at 9am, summarize my GitHub notifications"
2. Spring's `@Scheduled` task evaluates cron expressions
3. When triggered, creates an isolated agent session
4. Agent executes the prompt with available tools
5. Result stored in `job_executions` table
6. Optional: deliver result to a webhook or notification

### CronJob API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/cronjobs` | GET | List jobs |
| `/api/v1/cronjobs` | POST | Create job |
| `/api/v1/cronjobs/:id` | PUT | Update job |
| `/api/v1/cronjobs/:id` | DELETE | Delete job |
| `/api/v1/cronjobs/:id/trigger` | POST | Manual trigger |
| `/api/v1/cronjobs/:id/enable` | PATCH | Enable/disable |
| `/api/v1/cronjobs/:id/history` | GET | Execution history |

---

## 12. Subagents (TaskTool)

The `TaskTool` from `spring-ai-agent-utils` enables subagent orchestration — the main agent can
spawn specialized sub-agents with their own context windows, tools, and even different models.

### Use Cases

- **Code Review Agent:** Main agent spawns a review subagent with read-only tools
- **Research Agent:** Spawn a web-search subagent with `web-search` skill only
- **Test Agent:** Spawn a subagent to run tests and report results

### Configuration

```java
TaskToolCallbackProvider.builder()
    .taskRunner(new ChatClientTaskRunner(
        ChatClient.builder(anthropicModel)
            .defaultTools(readOnlyTools)
            .build(),
        "code-review-agent"
    ))
    .maxDepth(3)              // Prevent infinite recursion
    .build();
```

---

## 13. API Surface

### All Endpoints

| Domain | Endpoint | Method | Solo | Server | Status |
|--------|----------|--------|------|--------|--------|
| **Sessions** | `/api/v1/sessions` | GET | ✅ | ✅ | ✅ Built |
| | `/api/v1/sessions` | POST | ✅ | ✅ | ✅ Built |
| | `/api/v1/sessions/:id` | DELETE | ✅ | ✅ | ✅ Built |
| | `/api/v1/sessions/:id/title` | PATCH | ✅ | ✅ | ✅ Built |
| | `/api/v1/sessions/:id/export` | GET | ✅ | ✅ | 🔲 New |
| **Chat** | `/api/v1/chat` | POST | ✅ | ✅ | ⚠️ Stub |
| | `/api/v1/chat/answer` | POST | ✅ | ✅ | ⚠️ Stub |
| **Skills** | `/api/v1/skills` | GET | ✅ | ✅ | 🔲 New |
| | `/api/v1/skills/:name` | GET | ✅ | ✅ | 🔲 New |
| | `/api/v1/skills/rescan` | POST | ✅ | ✅ | 🔲 New |
| **MCP** | `/api/v1/mcp/servers` | GET | ✅ | ✅ | 🔲 New |
| | `/api/v1/mcp/servers` | POST | ✅ | ✅ | 🔲 New |
| | `/api/v1/mcp/servers/:id` | DELETE | ✅ | ✅ | 🔲 New |
| | `/api/v1/mcp/servers/:id/tools` | GET | ✅ | ✅ | 🔲 New |
| **CronJobs** | `/api/v1/cronjobs` | GET | ✅ | ✅ | 🔲 New |
| | `/api/v1/cronjobs` | POST | ✅ | ✅ | 🔲 New |
| | `/api/v1/cronjobs/:id` | PUT | ✅ | ✅ | 🔲 New |
| | `/api/v1/cronjobs/:id` | DELETE | ✅ | ✅ | 🔲 New |
| | `/api/v1/cronjobs/:id/trigger` | POST | ✅ | ✅ | 🔲 New |
| **SOUL** | `/api/v1/soul` | GET | ✅ | ✅ | 🔲 New |
| | `/api/v1/soul` | PUT | ✅ | ✅ | 🔲 New |
| **Settings** | `/api/v1/settings` | GET | ✅ | ✅ | 🔲 New |
| | `/api/v1/settings` | PUT | ✅ | ✅ | 🔲 New |
| | `/api/v1/settings/providers` | GET | ✅ | ✅ | 🔲 New |
| | `/api/v1/settings/models` | GET | ✅ | ✅ | 🔲 New |
| **Policy** | `/api/v1/policy` | GET | ✅ | ✅ | 🔲 New |
| | `/api/v1/policy` | PUT | ✅ | ✅ | 🔲 New |
| | `/api/v1/policy/profiles` | GET | ✅ | ✅ | 🔲 New |
| **Dashboard** | `/api/v1/dashboard/summary` | GET | ❌ | ✅ | 🔲 New |
| | `/api/v1/dashboard/agent-runs` | GET | ❌ | ✅ | 🔲 New |
| **Audit** | `/api/v1/audit-log` | GET | ❌ | ✅ | 🔲 New |
| | `/api/v1/audit-log/export` | GET | ❌ | ✅ | 🔲 New |
| **Users** | `/api/v1/users` | GET | ❌ | ✅ | 🔲 New |
| | `/api/v1/users` | POST | ❌ | ✅ | 🔲 New |
| | `/api/v1/users/:id` | PUT | ❌ | ✅ | 🔲 New |
| **Auth** | `/api/v1/auth/login` | POST | ❌ | ✅ | 🔲 New |
| | `/api/v1/auth/me` | GET | ❌ | ✅ | 🔲 New |
| **Health** | `/actuator/health` | GET | ✅ | ✅ | ✅ Built |

---

## 14. Configuration System

### `enterpriseclaw.yml` (Application Config)

```yaml
enterpriseclaw:
  # Agent identity
  soul: ~/.enterpriseclaw/SOUL.md
  
  # Skills directories
  skills:
    paths:
      - ~/.enterpriseclaw/skills
      - .enterpriseclaw/skills
  
  # MCP servers
  mcp:
    servers:
      # ... (see §8)
  
  # Policy (always active)
  policy:
    default-profile: coding
    # ... (see §4)
  
  # Provider configuration
  providers:
    default: openai
    openai:
      api-key: ${OPENAI_API_KEY:}
      model: gpt-4.1
    anthropic:
      api-key: ${ANTHROPIC_API_KEY:}
      model: claude-4-sonnet-20260301
    github:
      token: ${GITHUB_PAT:}
      model: openai/gpt-4.1
    ollama:
      base-url: http://localhost:11434
      model: llama3.3
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | One of these | OpenAI API key |
| `ANTHROPIC_API_KEY` | One of these | Anthropic API key |
| `GITHUB_PAT` | One of these | GitHub PAT with `models` scope |
| `OLLAMA_BASE_URL` | Optional | Local Ollama URL |
| `SPRING_PROFILES_ACTIVE` | No (default: `solo`) | `solo` or `server` |
| `SERVER_PORT` | No (default: `8080`) | HTTP port |
| `EC_SOUL_PATH` | No | Override SOUL.md location |
| `EC_SKILLS_PATH` | No | Additional skills directory |

---

## 15. React Frontend

### Pages

| Page | Route | Solo | Server | Description |
|------|-------|------|--------|-------------|
| **Chat** | `/chat`, `/chat/:id` | ✅ | ✅ | Main agent conversation |
| **Skills** | `/skills` | ✅ | ✅ | Browse/manage loaded skills |
| **MCP Servers** | `/mcp` | ✅ | ✅ | Configure MCP connections |
| **Settings** | `/settings` | ✅ | ✅ | API keys, model selection, SOUL.md editor |
| **CronJobs** | `/cronjobs` | ✅ | ✅ | Scheduled task management |
| **Policy** | `/policy` | ✅ | ✅ | View/edit policy rules |
| **Dashboard** | `/dashboard` | ❌ | ✅ | Usage metrics, agent activity |
| **Audit Log** | `/audit-log` | ❌ | ✅ | Searchable event log |
| **Users** | `/users` | ❌ | ✅ | Team member management |
| **Login** | `/login` | ❌ | ✅ | Authentication |

### Chat UI Features

- **Streaming messages** with token-by-token rendering
- **Tool call visualization** — show which tools are being called, with expandable input/output
- **Interactive QuestionCards** — buttons/select for agent questions
- **Thinking indicator** — show when model is reasoning (extended thinking)
- **Session sidebar** — list, create, delete, rename sessions
- **Model selector** — switch models per conversation
- **File attachment** — drag & drop files into context (solo mode)

---

## 16. Implementation Phases

### Phase 1 — Core Agent (MVP)

> **Goal:** A developer downloads it, runs it, chats with an AI that can read/write files and
> run commands. OpenClaw-in-a-browser.

**Backend:**
- [ ] Replace `StubChatServiceImpl` with real `AgentChatService` using Spring AI `ChatClient`
- [ ] SOUL.md loading and injection as system prompt
- [ ] SkillsTool integration — scan directories, load SKILL.md on demand
- [ ] FileSystemTools + ShellTools (solo mode beans)
- [ ] AskUserQuestionTool with web-based `CompletableFuture` handler
- [ ] Policy engine enforcement on every tool call (all modes)
- [ ] Provider configuration — OpenAI, Anthropic, GitHub Models, Ollama
- [ ] NDJSON streaming with tool_call/tool_result events
- [ ] Session history with MessageChatMemoryAdvisor

**Frontend:**
- [ ] Chat page — streaming messages, tool call chips, question cards
- [ ] Settings page — API key management, model selection, SOUL.md editor
- [ ] Skills page — browse loaded skills, view SKILL.md content
- [ ] Policy page — view/edit policy profile and rules

**Config:**
- [ ] `enterpriseclaw.yml` configuration loading
- [ ] Default SOUL.md shipped with the binary
- [ ] Default skills (file-operations, shell, git-operations)

### Phase 2 — Extensibility

> **Goal:** MCP servers, cron jobs, subagents. Power-user features.

- [ ] MCP client integration — stdio and SSE transports
- [ ] MCP server management UI
- [ ] CronJob scheduler with isolated agent sessions
- [ ] CronJob management UI
- [ ] TodoWriteTool integration
- [ ] TaskTool / subagent spawning
- [ ] Session export (JSON)

### Phase 3 — Team Server

> **Goal:** `docker-compose up` for teams. Governance, audit, multi-user.

- [ ] JWT authentication + user management
- [ ] Per-user and per-role policy rules
- [ ] Approved skills registry (admin curates skills)
- [ ] MCP server catalog (admin approves MCP servers)
- [ ] Centralized SOUL.md management
- [ ] Audit log with search and CSV export
- [ ] Dashboard — usage metrics, model costs, agent runs
- [ ] PostgreSQL with pgvector for semantic memory
- [ ] Admin UI (users, policies, skills, MCP, SOUL.md)

### Phase 4 — Distribution & Polish

> **Goal:** One-click install. Production-ready.

- [ ] JLink custom runtime image (macOS, Linux, Windows)
- [ ] Docker image with multi-stage build
- [ ] Memory system (vector search with pgvector)
- [ ] Workspace isolation per session
- [ ] Auto-update mechanism
- [ ] Telemetry (opt-in)

---

## 17. What We Keep from Current Codebase

| Component | Status | Action |
|-----------|--------|--------|
| Spring Boot 4 + Spring AI 2.0.0-M3 | ✅ Working | Keep |
| spring-ai-agent-utils 0.5.0 | ✅ Added | Keep |
| Gradle build + Taskfile | ✅ Working | Keep |
| React 19 + Vite + Tailwind frontend | ✅ Working | Keep |
| ChatController (6 endpoints) | ✅ Built | Keep, extend |
| Chat UI (MessageThread, MessageInput, QuestionCard) | ✅ Built | Keep, enhance |
| Frontend config.ts + http.ts | ✅ Built | Keep, extend |
| Flyway migrations (V1-V12) | ✅ Running | Keep, add new |
| PolicyEngine interface | ✅ Built | Keep, enhance |
| AuditService + AgentRunLog | ✅ Built | Keep |
| StubChatServiceImpl | ⚠️ Stub | **Replace** with AgentChatService |
| EnterpriseGatewayService | ⚠️ Old design | **Refactor** — simplify to ChatService |
| SkillRegistry (hardcoded skills) | ⚠️ Old design | **Replace** with SkillsTool |
| Multi-channel gateway concept | ❌ Not needed | **Drop** (web-only) |
| TenantContext/TenantFilter | ⚠️ Over-engineered | **Simplify** for server mode |
| Old sprint plans (Sprints 1-8) | ❌ Scrapped | **Drop** |

---

## 18. Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **LLM Framework** | Spring AI 2.0 | Native Spring ecosystem, ChatClient, tool calling, MCP |
| **Agent Tools** | spring-ai-agent-utils | SkillsTool, AskUser, Todo, TaskTool — exactly what we need |
| **Frontend** | React 19 + Vite | Already built, modern, fast |
| **Database (solo)** | H2 file-based | Zero config, ships with JLink binary |
| **Database (server)** | PostgreSQL + pgvector | Production-grade, vector search for memory |
| **Streaming** | NDJSON over HTTP | Already implemented, simpler than WebSocket |
| **Policy** | Always-on engine | Security is not optional — even solo mode has guardrails |
| **GitHub Models** | OpenAI-compatible endpoint | No special SDK — just point Spring AI OpenAI starter at GitHub |
| **Distribution** | JLink + Docker | JLink for solo binary, Docker for server |
| **Config format** | YAML (Spring-native) | `enterpriseclaw.yml` loaded by Spring's config system |

---

## 19. Non-Goals (v1)

- **Multi-channel support** (Slack, Teams, Discord) — web-only for v1
- **Plugin marketplace** — manual skill installation only
- **Billing / metering** — no usage-based billing
- **Custom model fine-tuning** — use pre-trained models
- **Mobile app** — browser-only, responsive design
- **Agent-to-Agent (A2A) protocol** — future consideration
- **Real-time collaboration** — single user per session

---

## 20. File Structure (Target)

```
enterpriseclaw/
├── AGENTS.md
├── SOUL.md                              ← Default agent personality
├── Taskfile.yml
├── build.gradle
├── enterpriseclaw.yml                   ← Application config (skills, MCP, policy)
├── docs/
│   ├── SPEC.md                          ← This file
│   └── ...
├── src/main/java/com/enterpriseclaw/
│   ├── EnterpriseclawApplication.java
│   ├── agent/                           ← NEW: Core agent loop
│   │   ├── AgentChatService.java        ← Real ChatClient implementation
│   │   ├── SoulLoader.java             ← SOUL.md loading
│   │   ├── ToolCatalogBuilder.java     ← Assemble tools + skills + MCP
│   │   └── WebQuestionHandler.java     ← AskUserQuestionTool handler
│   ├── chat/                            ← KEEP: REST endpoints + DTOs
│   ├── skills/                          ← REFACTOR: SkillsTool-based loading
│   ├── policy/                          ← ENHANCE: Always-on, profiles, guardrails
│   ├── mcp/                             ← NEW: MCP server management
│   ├── cronjobs/                        ← ENHANCE: Real scheduler
│   ├── audit/                           ← KEEP: Event logging
│   ├── settings/                        ← NEW: Provider config, UI settings
│   ├── config/                          ← NEW: enterpriseclaw.yml binding
│   └── server/                          ← NEW: Server-only beans (auth, users, admin)
├── src/main/resources/
│   ├── application.yml
│   ├── application-solo.yml
│   ├── application-server.yml
│   ├── db/migration/
│   └── default-soul.md                  ← Built-in SOUL.md
├── frontend/src/
│   ├── domain/
│   │   ├── chat/                        ← ENHANCE: Tool call viz, thinking
│   │   ├── skills/                      ← ENHANCE: Browse, view SKILL.md
│   │   ├── mcp/                         ← NEW: MCP server management
│   │   ├── policy/                      ← NEW: Policy viewer/editor
│   │   ├── cronjobs/                    ← ENHANCE: Real scheduler UI
│   │   ├── settings/                    ← ENHANCE: Providers, SOUL.md editor
│   │   ├── dashboard/                   ← Server-only
│   │   ├── audit/                       ← Server-only
│   │   └── users/                       ← Server-only
│   └── lib/
│       ├── config.ts                    ← Extend with new endpoints
│       └── http.ts                      ← Keep as-is
└── skills/                              ← Built-in SKILL.md files
    ├── file-operations/SKILL.md
    ├── shell/SKILL.md
    └── git-operations/SKILL.md
```

---

## Appendix A: OpenClaw Feature Mapping

| OpenClaw Feature | EnterpriseClaw Equivalent | Phase |
|------------------|---------------------------|-------|
| Agent loop (pi-embedded-runner) | AgentChatService + ChatClient | P1 |
| SKILL.md loading | SkillsTool (spring-ai-agent-utils) | P1 |
| SOUL.md | SoulLoader → system prompt | P1 |
| Tool policies (profiles) | PolicyEngine (always-on) | P1 |
| Interactive questions | AskUserQuestionTool + QuestionCard | P1 |
| File/Shell tools | FileSystemTools + ShellTools | P1 |
| Session management | JPA sessions + MessageChatMemoryAdvisor | P1 |
| NDJSON streaming | ResponseBodyEmitter + ChatEvent | P1 |
| MCP integration (mcporter) | spring-ai-mcp-client | P2 |
| Cron service | Spring @Scheduled + CronJob entity | P2 |
| Subagents (sessions_spawn) | TaskTool + ChatClientTaskRunner | P2 |
| TodoWriteTool | TodoWriteTool (spring-ai-agent-utils) | P2 |
| User management | Spring Security + JWT | P3 |
| Audit logging | AuditService (already built) | P3 |
| Memory (QMD/vector search) | pgvector + Spring AI VectorStore | P4 |
| Multi-channel (20+ channels) | ❌ Web-only (non-goal for v1) | — |
| Gateway (WebSocket RPC) | ❌ Not needed (direct Spring MVC) | — |

## Appendix B: GitHub Models — Available Models

Via `https://models.github.ai/inference/` with a GitHub PAT:

| Model | Provider | ID |
|-------|----------|----|
| GPT-4.1 | OpenAI | `openai/gpt-4.1` |
| GPT-4.1 mini | OpenAI | `openai/gpt-4.1-mini` |
| GPT-5 | OpenAI | `openai/gpt-5` |
| o3 | OpenAI | `openai/o3` |
| o4-mini | OpenAI | `openai/o4-mini` |
| Claude 4 Sonnet | Anthropic | `anthropic/claude-4-sonnet` |
| Llama 4 Scout | Meta | `meta/llama-4-scout` |
| Llama 4 Maverick | Meta | `meta/llama-4-maverick` |
| DeepSeek-R1 | DeepSeek | `deepseek/deepseek-r1` |
| Mistral Large | Mistral | `mistral/mistral-large` |
| Phi-4 | Microsoft | `microsoft/phi-4` |

**Usage:** Set `spring.ai.openai.base-url=https://models.github.ai/inference/` and
`spring.ai.openai.api-key=${GITHUB_PAT}`. No special SDK or integration needed.
