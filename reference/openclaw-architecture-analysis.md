Agent completed. agent_id: explore-openclaw, agent_type: explore, status: completed, description: Deep dive into OpenClaw, elapsed: 270s, total_turns: 0, duration: 270s

Perfect! Now I have a comprehensive understanding of OpenClaw. Let me create a detailed architectural summary:

## COMPREHENSIVE OPENCLAW ARCHITECTURE ANALYSIS

### **1. DIRECTORY STRUCTURE (2 Levels Deep)**

```
openclaw-main/
├── .agent/                          # Internal maintenance agents
├── .agents/                         # System agents (release, PR, security)
│   └── skills/                      # Agent-specific skills
├── .github/                         # GitHub workflows
├── apps/                            # Platform-specific apps (iOS, Android, etc)
├── assets/                          # Static assets (logos, images)
├── docs/                            # User/developer documentation
├── docker*/                         # Docker configuration files
├── extensions/                      # Optional plugin ecosystem (100+ extensions)
│   ├── openai/                      # OpenAI provider
│   ├── anthropic/                   # Anthropic provider
│   ├── google/                      # Google provider
│   ├── slack/                       # Slack channel
│   ├── telegram/                    # Telegram channel
│   ├── discord/                     # Discord channel
│   └── [70+ more channels/providers]
├── packages/                        # Monorepo packages
│   ├── clawdbot/                    # Bot client SDK
│   ├── moltbot/                     # Legacy bot framework
│   └── memory-host-sdk/             # Memory plugin SDK
├── skills/                          # Bundled skills (45+ skills)
│   ├── github/                      # GitHub CLI skill
│   ├── coding-agent/                # Code editing skill
│   ├── slack/                       # Slack skill
│   ├── discord/                     # Discord skill
│   ├── canvas/                      # Canvas rendering skill
│   └── [40+ more skills]
├── src/                             # Main TypeScript source (85 top-level dirs)
│   ├── agents/                      # Agent execution & tools (700+ files)
│   ├── acp/                         # ACP protocol (Advanced Computing Protocol)
│   ├── auto-reply/                  # Reply generation & streaming
│   ├── bootstrap/                   # Bootstrap configuration
│   ├── channels/                    # Channel implementations
│   ├── chat/                        # Chat message handling
│   ├── cli/                         # CLI implementation (commands, routing)
│   ├── commands/                    # Command handlers
│   ├── config/                      # Configuration system
│   ├── context-engine/              # LLM context management
│   ├── cron/                        # Scheduled jobs (cron service)
│   ├── daemon/                      # Daemon management
│   ├── flows/                       # Interactive flows (setup, onboarding)
│   ├── gateway/                     # Core gateway server
│   ├── hooks/                       # Webhook & lifecycle hooks
│   ├── infra/                       # Infrastructure utilities
│   ├── interactive/                 # Interactive Q&A payloads
│   ├── logging/                     # Logging system
│   ├── plugins/                     # Plugin system
│   ├── routing/                     # Message routing
│   ├── sessions/                    # Session management
│   ├── terminal/                    # Terminal/TUI utilities
│   ├── tts/                         # Text-to-speech
│   ├── types/                       # Type definitions
│   ├── utils/                       # Utilities
│   └── [15+ more directories]
├── test/                            # Integration tests
├── ui/                              # Web UI (React/Angular)
├── vendor/                          # Vendored dependencies
├── package.json                     # Root monorepo config
├── pnpm-workspace.yaml              # pnpm workspace config
├── tsconfig.json                    # TypeScript configuration
├── README.md                        # Main documentation
├── VISION.md                        # Project vision & direction
└── CONTRIBUTING.md                 # Contributing guidelines
```

---

### **2. LANGUAGE & FRAMEWORK**

**Primary Language:** TypeScript (Node.js)  
**Runtime:** Node 24 (recommended) or Node 22.16+  
**Build System:** pnpm (monorepo with workspace.yaml)  
**Module System:** ES Modules (`"type": "module"` in package.json)  
**Key Dependencies:**
- `@mariozechner/pi-coding-agent` - Core embedded agent runner
- Express-like gateway server
- Multiple provider SDKs (Anthropic, OpenAI, Google, etc)
- MCP (Model Context Protocol) via `mcporter`
- Zod for schema validation

---

### **3. ARCHITECTURE OVERVIEW**

```
OpenClaw System Architecture

┌─────────────────────────────────────────────────────────────┐
│                         CLI Entry Point                       │
│                    (src/entry.ts → openclaw.mjs)            │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        ▼                             ▼
    CLI Commands              Gateway Server
  (src/cli/program/)        (src/gateway/)
    ├─ agent                  ├─ Messaging Server
    ├─ message send           ├─ RPC Protocol
    ├─ config                 ├─ Channel Integration
    ├─ skills                 │  (WhatsApp, Slack, Telegram, etc)
    ├─ plugins                ├─ Session Management
    ├─ cron                   ├─ Cron Service
    ├─ daemon                 └─ Hook System
    └─ gateway

        │
        └──────────────┬──────────────┐
                       ▼              ▼
              Configuration System    Sessions Store
              (src/config/)          (src/config/sessions/)
              ├─ openclaw.json       ├─ Session file (JSON)
              ├─ secrets store       ├─ Transcript (JSONL)
              ├─ MCP servers         ├─ Agent workspace
              ├─ Models/Providers    └─ Model overrides
              ├─ Tool policies       
              └─ Channels            
```

**Core Flow:**
1. **Entry Point** (`entry.ts`) → Parses CLI args, handles version/help
2. **CLI Router** → Routes to appropriate command handler
3. **Agent Command** (`agents/agent-command.ts`) → Orchestrates agent execution
4. **Embedded PI Agent** (`agents/pi-embedded-runner/`) → Runs the actual LLM loop
5. **Tool Execution** → Calls OpenClaw tools or MCP servers
6. **Response Streaming** → Streams back to channels/caller
7. **Session Persistence** → Saves transcript & metadata

---

### **4. SOUL.md (Agent Personality)**

**Location:** `/docs/reference/templates/SOUL.md`  
**Format:** Markdown with YAML front matter  
**Purpose:** Defines agent personality, boundaries, and operational philosophy

**Core Concepts:**
```yaml
---
title: "SOUL.md - Who You Are"
read_when:
  - Bootstrapping a workspace manually
---

# SOUL.md Template

## Core Truths
1. Be genuinely helpful (skip performative language)
2. Have opinions & personality
3. Be resourceful before asking
4. Earn trust through competence
5. Remember you're a guest (respect user privacy)

## Boundaries
- Keep private things private
- Ask before acting externally
- Don't send half-baked messages
- Be careful in group chats

## Vibe
- Concise when needed, thorough when it matters
- Not a corporate drone
- Not a sycophant, just good

## Continuity
- Each session you wake up fresh
- SOUL.md is your memory
- Update it as you learn who you are
```

**Integration:** Agents read SOUL.md on startup as system context for the LLM.

---

### **5. SKILLS ARCHITECTURE**

**Location:** `/skills/` + extensions with SKILL.md files

**SKILL.md Format:**
```yaml
---
name: skill-name
description: "What it does"
metadata:
  openclaw:
    emoji: "🔧"
    requires:
      bins: ["executable"]
    install:
      - id: homebrew
        kind: brew
        formula: formula-name
        bins: [executable]
---

# Skill Name

## When to Use
- Use case 1
- Use case 2

## When NOT to Use
- Counter-example 1

## Setup
Command to set up

## Common Commands
Examples with explanations
```

**45+ Built-in Skills:**
- `github` - GitHub CLI operations
- `coding-agent` - Code editing/creation
- `slack` - Slack operations
- `discord` - Discord operations
- `canvas` - Rendering interactive canvases
- `notion` - Notion integration
- `obsidian` - Obsidian notes
- `imsg` - iMessage via BlueBubbles
- `tmux` - Tmux session control
- `video-frames` - Video processing
- `voice-call` - Voice capabilities
- And 30+ more...

**Skill Management:**
- Skills are loaded at runtime from `/skills/` directory
- Each skill is a standalone directory with `SKILL.md` + implementation
- Skills can have dependencies (binaries, APIs)
- Skills can be installed/managed via `openclaw skills` CLI

---

### **6. MCP (Model Context Protocol) INTEGRATION**

**Location:** `src/config/mcp-config.ts`, `src/agents/mcp-stdio.ts`, `src/agents/pi-bundle-mcp-tools.ts`

**Architecture:**
```
┌─────────────────────────────────────┐
│    Agent (LLM running in pi)         │
└────────────────────┬────────────────┘
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
    OpenClaw Tools            MCP Tools
  (canvas, sessions,    (via mcporter bridge)
   message, cron, etc)     ├─ Filesystem
                            ├─ Web search
                            ├─ Custom MCPs
                            └─ Any MCP server
```

**Configuration (openclaw.json):**
```json
{
  "mcp": {
    "servers": {
      "qmd": {
        "command": "qmd",
        "args": ["mcp"]
      },
      "filesystem": {
        "command": "node",
        "args": ["path/to/mcp-server"]
      }
    }
  }
}
```

**Key Files:**
- `src/config/types.mcp.ts` - Type definitions
- `src/config/mcp-config.ts` - MCP server config management
- `src/agents/mcp-stdio.ts` - MCP stdio communication
- `src/agents/pi-bundle-mcp-tools.ts` - Bundle MCP tools for agent

**How It Works:**
1. MCP servers are spawned as child processes
2. Stdio-based JSON-RPC communication
3. Tool definitions from MCP are wrapped as OpenClaw tools
4. Agent sees MCP tools alongside OpenClaw native tools
5. Tool results are streamed back to agent

---

### **7. AGENT LOOP & STREAMING**

**Main Files:**
- `src/agents/agent-command.ts` (912 lines) - Command orchestration
- `src/agents/pi-embedded-runner/` (100+ files) - Core loop implementation
- `src/agents/pi-embedded-subscribe.ts` (27k lines) - Event subscription & streaming
- `src/agents/pi-embedded.ts` - Exports & API

**Agent Loop Flow:**

```
1. AGENT COMMAND (agent-command.ts)
   ├─ Resolve session & configuration
   ├─ Build tool catalog
   ├─ Apply model overrides/fallbacks
   └─ Call runEmbeddedPiAgent()

2. RUN EMBEDDED PI AGENT (pi-embedded-runner/run.js)
   ├─ Initialize SessionManager from PI SDK
   ├─ Load session history
   ├─ Limit history turns
   ├─ Apply sandboxing policies
   ├─ Call llmStream() with messages + tools
   └─ Subscribe to message stream

3. PI SESSION SUBSCRIBE (pi-embedded-subscribe.ts)
   ├─ Process content blocks (text, tool_use, etc)
   ├─ Emit assistantDelta events (streaming)
   ├─ Execute tool calls when needed
   ├─ Wait for tool results
   ├─ Append to message history
   ├─ Detect conversation end
   └─ Compact session if needed

4. TOOL EXECUTION (pi-embedded-subscribe.handlers.tools.ts)
   ├─ Extract tool call from LLM output
   ├─ Apply tool policy checks (owner-only, etc)
   ├─ Execute tool with sandbox constraints
   ├─ Capture output/errors
   ├─ Add to transcript
   └─ Return result to LLM

5. RESPONSE DELIVERY
   ├─ Accumulate visible text
   ├─ Stream to caller (CLI, gateway, etc)
   ├─ Persist transcript to disk
   ├─ Update session metadata
   └─ Return completion summary
```

**Streaming Architecture:**

```typescript
// Streaming happens via event subscriptions:
subscribeEmbeddedPiSession(session, {
  onContentDelta: (chunk) => { /* stream text */ },
  onToolUseStart: (tool) => { /* notify tool start */ },
  onToolResult: (result) => { /* notify tool result */ },
  onBlockReplyFlush: (block) => { /* emit complete block */ },
  onLifecycleEnd: () => { /* session complete */ },
  onError: (error) => { /* handle error */ }
})
```

**Key Features:**
- **Streaming:** Text streamed token-by-token via deltas
- **Tool Loop:** Automatic tool execution during LLM output
- **Soft Chunks:** Splits output by paragraphs for better UX
- **Session Compaction:** Automatically compacts old messages to fit context
- **Error Handling:** Catches and retries on transient failures
- **Streaming Cancellation:** Can abort mid-generation

---

### **8. TOOLS SYSTEM**

**Location:** `src/agents/openclaw-tools.ts`, `src/agents/tools/`

**Tool Categories:**

**OpenClaw Native Tools (built-in):**
```
Canvas Tool              - Interactive UI rendering
Nodes Tool              - Display/control devices
Cron Tool               - Schedule tasks
Message Tool            - Send to channels
TTS Tool                - Text-to-speech
Image Tool              - Process local images
PDF Tool                - PDF operations
Web Search Tool         - Search (if configured)
Web Fetch Tool          - Firecrawl integration (if configured)
Gateway Tool            - Interact with gateway RPC
Sessions Tools:
  - sessions_list       - List sessions
  - sessions_history    - Get session history
  - sessions_send       - Send to session
  - sessions_spawn      - Create subagent
  - sessions_yield      - Yield to parent
Agent Tools:
  - agents_list         - List agents
Subagent Tools          - Spawn isolated agents
```

**Tool Policies & Permissions:**

```typescript
// Tool profiles: minimal | coding | messaging | full
type ToolProfileId = "minimal" | "coding" | "messaging" | "full";

// Policy types
type ToolPolicyLike = {
  allow?: string[];   // Specific tools
  deny?: string[];    // Blocked tools
};

// Owner-only tools (require senderIsOwner)
OWNER_ONLY_TOOL_NAMES = [
  "cron", "gateway", "nodes", "whatsapp_login"
];
```

**Tool Execution Flow:**
1. LLM outputs tool_use block
2. Tool policy checked (allow/deny lists)
3. Owner-only check (if applicable)
4. Pre-tool callbacks (`beforeToolCall` hooks)
5. Tool executed in sandbox context
6. Output captured & truncated if needed
7. Result added to transcript
8. Returned to LLM for next iteration

**Sandbox Constraints:**
- File system access restricted to workspace
- Environment variables filtered
- Process execution limited
- Command whitelist/blacklist
- Timeout protection per tool call

---

### **9. SESSION MANAGEMENT**

**Location:** `src/config/sessions/`, `src/sessions/`

**Session Storage:**

```
~/.openclaw/sessions/
├── <agent-id>/
│   ├── <session-id>.json              # Session metadata
│   ├── <session-id>.transcript.jsonl  # Conversation history
│   ├── <session-id>/                  # Session workspace
│   │   ├── .agent/                    # Internal files
│   │   ├── files/                     # User files
│   │   └── [workspace contents]
│   └── ...
```

**Session Entry Structure:**

```typescript
type SessionEntry = {
  id: string;
  agentId: string;
  channel?: string;
  accountId?: string;
  created: string;           // ISO timestamp
  lastActivity: string;      // ISO timestamp
  model?: string;
  modelOverride?: string;    // Session-specific override
  providerOverride?: string; // Session-specific provider
  authProfileOverride?: string;
  metadata?: {
    [key: string]: string | number | boolean;
  };
  messages?: Array<{
    role: "user" | "assistant";
    content: string | ContentBlock[];
  }>;
  // ... more fields
};
```

**Session Management Operations:**

```typescript
// Load session
const session = await loadSessionStore(path);
const entry = session[sessionKey];

// Update session
await updateSessionStore(path, (store) => {
  store[sessionKey] = {
    ...store[sessionKey],
    model: "claude-opus-4-1"
  };
  return store[sessionKey];
});

// Session lifecycle
// Create: new session on /new or first message
// Update: persist messages after each turn
// Reset: /reset clears messages but keeps metadata
// Archive: /delete removes session
```

**Session Types:**
1. **Direct Sessions** - One-on-one with agent
2. **Channel Sessions** - From messaging channels (WhatsApp, Slack, etc)
3. **Cron Sessions** - Scheduled job sessions
4. **Subagent Sessions** - Child agents spawned by parent
5. **ACP Sessions** - Advanced Computing Protocol sessions

---

### **10. CRON JOBS (Scheduled Tasks)**

**Location:** `src/cron/`, `src/config/types.cron.ts`, `src/agents/tools/cron-tool.ts`

**Cron Job Structure:**

```typescript
type CronJob = {
  id: string;
  label?: string;
  schedule: string;         // Cron expression or "at" time
  agent?: string;
  message: string;          // Task description
  deliver?: {               // Optional delivery config
    mode?: "announce" | "webhook";
    to?: string;            // Channel/user
    channel?: string;
    accountId?: string;
  };
  enabled?: boolean;
  model?: string;
  thinking?: "off" | "low" | "medium" | "high";
  retry?: {
    maxAttempts?: number;
    backoffMs?: number[];
    retryOn?: CronRetryOn[];
  };
  createdAt?: string;
};
```

**Cron Service Architecture:**

```
┌─────────────────────────────────────┐
│      Cron Service (runs always)      │
│  (src/cron/service.ts)              │
└────────────┬────────────────────────┘
             │
    ┌────────┴────────┐
    ▼                 ▼
Job Queue         Timer Manager
├─ Schedule       ├─ Arm next timer
│  next run       ├─ Fire on tick
├─ Retry logic    └─ Re-arm after run
└─ Delivery

    │
    ▼
┌──────────────────────────┐
│   Isolated Agent (per job)│
│  (src/cron/isolated-agent)│
│  - Spawn fresh process    │
│  - Run agent task         │
│  - Capture output         │
│  - Report delivery        │
└──────────────────────────┘
```

**Cron Features:**
- **Schedules:** Standard cron expressions + "at" for one-off
- **Retries:** Automatic retry on transient errors
- **Delivery:** Can deliver to channels or webhooks
- **Failure Alerts:** Notify on persistent failures
- **Session Retention:** Auto-cleanup of old cron sessions
- **Run Logs:** JSONL logs of execution history
- **Concurrency:** Configurable max concurrent runs

**Cron Tool (agent-accessible):**
```typescript
// Agent can schedule tasks
cron_add({
  label: "Daily digest",
  schedule: "0 9 * * *",
  message: "Generate daily summary",
  deliver: { to: "user", mode: "announce" }
})
```

---

### **11. CONFIGURATION SYSTEM**

**Location:** `src/config/`

**Main Config File:** `~/.openclaw/openclaw.json`

**Configuration Structure:**

```typescript
type OpenClawConfig = {
  meta?: { lastTouchedVersion?: string };
  auth?: AuthConfig;           // API key management
  acp?: AcpConfig;            // Advanced Computing Protocol
  env?: EnvConfig;            // Environment variables
  secrets?: SecretsConfig;    // Secret storage
  skills?: SkillsConfig;      // Skill configuration
  plugins?: PluginsConfig;    // Plugin ecosystem
  models?: ModelsConfig;      // LLM models & providers
  agents?: AgentsConfig;      // Agent definitions
  tools?: ToolsConfig;        // Tool policies
  bindings?: AgentBinding[];  // Channel-agent bindings
  channels?: ChannelsConfig;  // Channel configs (Slack, etc)
  commands?: CommandsConfig;  // Command whitelist
  approvals?: ApprovalsConfig; // Approval workflows
  session?: SessionConfig;    // Session settings
  cron?: CronConfig;          // Cron job settings
  hooks?: HooksConfig;        // Lifecycle hooks
  gateway?: GatewayConfig;    // Gateway server settings
  memory?: MemoryConfig;      // Memory/embedding settings
  mcp?: McpConfig;            // MCP server settings
  browser?: BrowserConfig;    // Browser automation
  web?: WebConfig;            // Web settings
  ui?: UiConfig;              // UI customization
  // ... more sections
};
```

**Agent Configuration:**

```typescript
type AgentConfig = {
  id?: string;
  model?: string;
  modelFallbacks?: string[];
  provider?: string;
  identity?: {
    name?: string;
    emoji?: string;
    avatar?: string;
  };
  thinking?: {
    enabled?: boolean;
    default?: "off" | "low" | "medium" | "high";
  };
  tools?: {
    profile?: "minimal" | "coding" | "messaging" | "full";
    allow?: string[];
    deny?: string[];
  };
  memory?: MemoryConfig;
  // ... more options
};
```

**Config Loading:**

```typescript
// Load config with runtime defaults
const config = await loadConfig();

// Config is cached and validated on load
// $include allows splitting config across files
// ${ENV} substitution for secrets
// Plugin-provided schema extensions supported
```

**Config Validation:**

```typescript
// Uses Zod schemas for validation
const validated = validateConfigObjectWithPlugins(configObject);
if (!validated.ok) {
  // Issues contain path + message
  for (const issue of validated.issues) {
    console.error(`${issue.path}: ${issue.message}`);
  }
}
```

---

### **12. CLI COMMANDS**

**Location:** `src/cli/`

**Major Commands:**

```
openclaw --help                      # Show help
openclaw --version                   # Show version

# Agent interaction
openclaw agent [options]             # Run agent command
  --message TEXT                     # Message to send
  --session ID                       # Use specific session
  --model MODEL                      # Override model
  --thinking high|medium|low|off    # Enable extended thinking
  --verbose LEVEL                    # Verbosity level
  --json                            # Output JSON

openclaw message send                # Send message to channel
  --to RECIPIENT                     # Target (phone, user ID, etc)
  --message TEXT                     # Message body
  --media FILES                      # Attach media

# Session management
openclaw sessions list               # List sessions
openclaw sessions history            # View session history
openclaw sessions delete ID          # Delete session
openclaw sessions export ID          # Export session
openclaw sessions /new               # New session
openclaw sessions /reset             # Reset session

# Skills
openclaw skills list                 # List available skills
openclaw skills info SKILL           # Show skill details
openclaw skills install SKILL        # Install skill
openclaw skills docs SKILL           # Show skill documentation

# Configuration
openclaw config get [KEY]            # Get config value
openclaw config set KEY VALUE        # Set config value
openclaw config reset                # Reset to defaults
openclaw config validate             # Validate config file

# Models & auth
openclaw models list                 # List configured models
openclaw models set MODEL ID         # Set default model
openclaw auth list                   # List auth profiles
openclaw auth login PROVIDER         # Authenticate

# Plugins
openclaw plugins list                # List plugins
openclaw plugins install URL         # Install plugin
openclaw plugins update              # Update plugins
openclaw plugins uninstall PLUGIN    # Remove plugin

# Channels
openclaw channels list               # List channels
openclaw channels add CHANNEL        # Add channel
openclaw channels config CHANNEL     # Configure channel

# Cron
openclaw cron add                    # Add cron job
openclaw cron list                   # List cron jobs
openclaw cron edit ID                # Edit cron job
openclaw cron delete ID              # Delete cron job
openclaw cron run ID                 # Run now

# Gateway
openclaw gateway [options]           # Start gateway server
  --port PORT                        # Server port
  --verbose                          # Verbose logging
  --dev                              # Development mode

# Daemon
openclaw daemon start                # Start daemon
openclaw daemon stop                 # Stop daemon
openclaw daemon status               # Check status
openclaw daemon logs                 # View logs

# System
openclaw doctor                      # Health check
openclaw update [options]            # Update OpenClaw
  --channel stable|beta|dev         # Update channel
  --install-daemon                  # Install daemon

openclaw onboard [options]          # Interactive setup
  --install-daemon                  # Install daemon
```

---

### **13. USER IDENTITY & PROFILES**

**Location:** `src/agents/identity.ts`, `src/config/types.identity.ts`

**Identity Configuration:**

```typescript
type IdentityConfig = {
  name?: string;              // Display name
  emoji?: string;             // Avatar emoji
  avatar?: string;            // Avatar image URL or data URI
};

// Resolved for a specific agent
const identity = resolveAgentIdentity(config, agentId);
```

**Identity Resolution (Cascading):**

```
1. Agent-specific identity
   └─ config.agents[agentId].identity

2. Global identity
   └─ config.ui.assistant

3. Default identity
   └─ "OpenClaw" with default emoji
```

**Message Prefixes:**

```typescript
// Auto-generated message prefixes (can be customized)
const messagePrefix = resolveMessagePrefix(config, agentId);
// e.g., "[Assistant Name]" or "" if allowFrom configured

const responsePrefix = resolveResponsePrefix(config, agentId);
// e.g., "[Assistant Name]" or custom per channel
```

**User Identity:**
- User identified by sender ID from channel
- Owner status tracked in sessions
- Per-user tool policies enforced

---

### **14. MEMORY SYSTEM**

**Location:** `src/config/types.memory.ts`, `src/plugins/memory-*`

**Memory Configuration:**

```typescript
type MemoryConfig = {
  backend?: "builtin" | "qmd";  // Memory backend
  citations?: "auto" | "on" | "off";
  qmd?: MemoryQmdConfig;
};

type MemoryQmdConfig = {
  command?: string;             // qmd executable
  mcporter?: {
    enabled?: boolean;          // Use mcporter bridge
    serverName?: string;        // MCP server name
    startDaemon?: boolean;
  };
  searchMode?: "query" | "search" | "vsearch";
  paths?: Array<{
    path: string;
    name?: string;              // Index name
    pattern?: string;           // File pattern
  }>;
  sessions?: {
    enabled?: boolean;          // Index cron sessions
    exportDir?: string;
    retentionDays?: number;
  };
  update?: {
    interval?: string;          // Update schedule
    debounceMs?: number;
    onBoot?: boolean;
    commandTimeoutMs?: number;
  };
  limits?: {
    maxResults?: number;        // Max search results
    maxSnippetChars?: number;
    maxInjectedChars?: number;
    timeoutMs?: number;
  };
};
```

**Memory Backends:**
1. **Builtin** - Simple in-memory caching (development)
2. **QMD** - Full-featured semantic search via `qmd` CLI

**Memory Features:**
- **Embedding:** Vector embeddings of documents
- **Search:** Semantic search at agent runtime
- **Citations:** Track which memory items were used
- **Indexing:** Automatic indexing of configured paths
- **Session Export:** Can index past cron sessions

**Memory Integration:**
- Memory results injected into system prompt
- Agent sees citations with confidence scores
- User can explicitly query memory

---

### **15. PERMISSIONS & POLICIES**

**Location:** `src/agents/tool-policy.ts`, `src/config/types.tools.ts`

**Tool Access Control:**

```typescript
// Tool profiles (predefined permission sets)
type ToolProfileId = "minimal" | "coding" | "messaging" | "full";

// Custom policies
type ToolsConfig = {
  profile?: ToolProfileId;    // Default profile
  by?: {
    role?: string;            // By user role (future)
    sender?: Array<{
      address?: string;
      policy?: ToolPolicyLike;
    }>;
  };
  policy?: ToolPolicyLike;
};

type ToolPolicyLike = {
  allow?: string[];     // Explicit allow list
  deny?: string[];      // Explicit deny list
};
```

**Owner-Only Tools:**
```typescript
// These tools are restricted to owner senders
const OWNER_ONLY_TOOLS = [
  "cron",              // Schedule tasks
  "gateway",           // Gateway RPC
  "nodes",             // Device control
  "whatsapp_login"     // Special auth
];

// Applied per-sender
applyOwnerOnlyToolPolicy(tools, senderIsOwner);
```

**Tool Policy Resolution (Cascading):**

```
1. Sender-specific policy (if exists)
   └─ config.tools.by.sender[address].policy

2. Global tool policy
   └─ config.tools.policy

3. Tool profile
   └─ config.tools.profile (minimal|coding|messaging|full)

4. Tool defaults
   └─ Tool definition ownerOnly flag
```

**Access Control Points:**
1. **Channel Level** - Who can send messages
2. **Tool Level** - Which tools available
3. **Execution Level** - Pre-execution validation
4. **Data Level** - File system access checks

---

### **16. INTERACTIVE QUESTIONS (AskUserQuestion)**

**Location:** `src/interactive/payload.ts`

**Interactive Reply Types:**

```typescript
type InteractiveReplyTextBlock = {
  type: "text";
  text: string;              // Display text
};

type InteractiveReplyButtonsBlock = {
  type: "buttons";
  buttons: Array<{
    label: string;           // Button text
    value: string;           // Return value
    style?: "primary" | "secondary" | "success" | "danger";
  }>;
};

type InteractiveReplySelectBlock = {
  type: "select";
  placeholder?: string;
  options: Array<{
    label: string;
    value: string;
  }>;
};

// Composed reply
type InteractiveReply = {
  blocks: InteractiveReplyBlock[];
};
```

**How It Works:**

```typescript
// 1. Agent can output interactive blocks in response
const reply = {
  blocks: [
    { type: "text", text: "Choose an option:" },
    { type: "buttons", buttons: [
      { label: "Option A", value: "a", style: "primary" },
      { label: "Option B", value: "b" }
    ]}
  ]
};

// 2. Channel renders interactive UI
// 3. User selects option
// 4. Selection returned to agent as message
// 5. Agent continues with selection result
```

**Channel Support:**
- **WhatsApp** - Button messages
- **Telegram** - Inline keyboards
- **Slack** - Block Kit
- **Discord** - Reactions or buttons
- **Matrix** - Custom UI
- **WebChat** - Rich UI

---

### **17. SUBAGENTS (Task Delegation)**

**Location:** `src/agents/tools/sessions-spawn-tool.ts`, `src/agents/subagent-*.ts`

**Subagent Spawning:**

```typescript
// Agent calls sessions_spawn tool
sessions_spawn({
  runtime: "subagent",           // or "acp" for more power
  task: "Summarize the document", // Task description
  agentId: "custom-agent",       // Optional specific agent
  model: "claude-opus-4-1",      // Optional model override
  thinking: "high",              // Optional thinking level
  label: "Summary Task",         // For tracking
  mode: "run",                   // "run" (one-shot) or "session" (persistent)
  timeout: 300,                  // Timeout in seconds
  sandbox: "inherit",            // "inherit" or "require"
  attachments: [                 // Optional file attachments
    {
      name: "document.md",
      content: "...",
      encoding: "utf8"
    }
  ]
})
```

**Subagent Architecture:**

```
Parent Agent
    │
    ├─ sessions_spawn() call
    │
    ▼
┌─────────────────────────────┐
│  Subagent Spawn Handler     │
├─────────────────────────────┤
│ 1. Create isolated session  │
│ 2. Copy/mount workspace     │
│ 3. Inherit auth profiles    │
│ 4. Set model override       │
│ 5. Spawn agent process      │
│ 6. Run task                 │
│ 7. Capture output           │
│ 8. Return to parent         │
└─────────────────────────────┘
    │
    ▼
Subagent Process (independent)
├─ Isolated file system
├─ Separate session storage
├─ Own tool access
├─ Parent workspace inherited
└─ Can spawn deeper subagents (with depth limits)
```

**Subagent Features:**
- **Runtime Options:**
  - `subagent` - Lightweight, shares runtime
  - `acp` - Full Advanced Computing Protocol (heavier)
- **Sandbox Modes:**
  - `inherit` - Use parent workspace
  - `require` - Explicit sandbox
- **Depth Limits:** Prevent infinite nesting
- **Cleanup:** Optional auto-cleanup after completion
- **Streaming:** Can stream parent output back to parent
- **Inheritance:** Inherits parent's auth, workspace, model fallbacks

**Subagent Use Cases:**
- Complex multi-step tasks
- Parallel task execution
- Specialized agent for specific domain
- Isolating risky operations
- Task delegation to team members

---

### **18. GATEWAY PROTOCOL & RPC**

**Location:** `src/gateway/`, `src/gateway/protocol/`

**Gateway Architecture:**

```
┌──────────────────────────────────────┐
│       Gateway Server                  │
│  (HTTP + RPC over WebSocket)          │
├──────────────────────────────────────┤
│ Messaging Service                    │
│ ├─ WhatsApp                          │
│ ├─ Telegram                          │
│ ├─ Slack                             │
│ ├─ Discord                           │
│ └─ [20+ more channels]               │
├──────────────────────────────────────┤
│ Session Management                   │
│ ├─ Load/save sessions                │
│ ├─ Route messages                    │
│ └─ Manage lifecycle                  │
├──────────────────────────────────────┤
│ RPC Methods                          │
│ ├─ agent                             │
│ ├─ config                            │
│ ├─ skills                            │
│ ├─ models                            │
│ ├─ cron                              │
│ └─ [more RPC methods]                │
└──────────────────────────────────────┘
```

**RPC Protocol:**

```typescript
// Client-to-gateway RPC call
{
  jsonrpc: "2.0",
  id: "call-1",
  method: "agent",
  params: {
    sessionKey: "agent-1:session-abc",
    body: "What's the weather?",
    channel: "whatsapp",
    accountId: "1234567890"
  }
}

// Gateway response (streaming)
{
  jsonrpc: "2.0",
  id: "call-1",
  result: {
    status: "streaming",
    data: {
      type: "assistant_delta",
      delta: "The weather is..."
    }
  }
}
```

**Major RPC Methods:**
- `agent` - Run agent command
- `config` - Get/set config
- `models` - List/configure models
- `skills` - List/install skills
- `plugins` - Manage plugins
- `cron` - Manage cron jobs
- `sessions` - Session operations
- `channels` - Channel operations
- `hooks` - Hook management
- `memory` - Memory search

---

### **19. FULL ARCHITECTURE DIAGRAM**

```
┌─────────────────────────────────────────────────────────────┐
│                     OpenClaw Complete System                 │
└─────────────────────────────────────────────────────────────┘

ENTRY POINTS:
├─ CLI (entry.ts → openclaw.mjs)
│  └─ run commands: agent, message, config, cron, etc.
├─ Gateway Server (gateway/)
│  └─ WebSocket RPC + HTTP
└─ Daemon (runs 24/7)
   └─ Cron service

CORE AGENT EXECUTION:
┌────────────────────────────────────────┐
│ Agent Command (agent-command.ts)       │
│ ├─ Load session                        │
│ ├─ Build tool catalog                  │
│ ├─ Apply model/auth overrides          │
│ └─ runEmbeddedPiAgent()                │
└────────────────────────────────────────┘
    │
    ▼
┌────────────────────────────────────────┐
│ Embedded PI Agent Runner               │
│ (pi-embedded-runner/)                  │
│ ├─ Load session history                │
│ ├─ Initialize SessionManager           │
│ ├─ Call llmStream()                    │
│ └─ Subscribe to message events         │
└────────────────────────────────────────┘
    │
    ▼
┌────────────────────────────────────────┐
│ LLM Provider (Anthropic, OpenAI, etc) │
│ ├─ Stream text output                  │
│ ├─ Emit tool_use blocks                │
│ └─ Process tool results                │
└────────────────────────────────────────┘
    │
    ├─────────────────┬──────────────────┐
    ▼                 ▼                  ▼
OpenClaw Tools   MCP Tools          Native Skills
├─ Canvas        ├─ Filesystem      ├─ GitHub CLI
├─ Message       ├─ Web Search      ├─ Coding agent
├─ Cron          ├─ Custom MCPs     ├─ Canvas
├─ Sessions      └─ [MCP servers]   ├─ Slack
├─ Nodes                            └─ [45+ skills]
└─ [More]

PERSISTENCE & STATE:
┌────────────────────────────────────────┐
│ Configuration System                   │
│ ├─ openclaw.json (main config)         │
│ ├─ Auth profiles (secrets)             │
│ ├─ Session store (sessions.json)       │
│ └─ MCP servers (mcp section)           │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ Session Persistence                    │
│ ├─ Session metadata (.json)            │
│ ├─ Conversation transcript (.jsonl)    │
│ ├─ Session workspace files             │
│ └─ Compaction history                  │
└────────────────────────────────────────┘

BACKGROUND SERVICES:
┌────────────────────────────────────────┐
│ Cron Service                           │
│ ├─ Schedule next jobs                  │
│ ├─ Execute on schedule                 │
│ ├─ Retry transient failures            │
│ ├─ Deliver results to channels         │
│ └─ Maintain run logs                   │
└────────────────────────────────────────┘

CHANNELS (Messaging Integrations):
WhatsApp, Telegram, Slack, Discord, Google Chat, Signal,
iMessage, BlueBubbles, IRC, MS Teams, Matrix, Feishu,
LINE, Mattermost, Nextcloud Talk, Nostr, Synology Chat,
Tlon, Twitch, Zalo, Zalo Personal, WeChat, WebChat

PROVIDERS (LLM):
Anthropic, OpenAI, Google (Gemini), Groq, OpenRouter,
Ollama, Mistral, TogetherAI, DeepSeek, Moonshot, Kimi,
Grok (X), Perplexity, Hugging Face, Amazon Bedrock,
NVIDIA, VolcEngine, BytePlus, Qianfan, Minimax
```

---

### **20. KEY SOURCE FILES FOR JAVA/SPRING BOOT REIMPLEMENTATION**

**Must Read (15 most critical files):**

1. **`src/entry.ts`** - CLI entry point & initialization
2. **`src/agents/agent-command.ts`** (912 lines) - Command orchestration
3. **`src/agents/pi-embedded-runner.ts`** (1230 lines) - Core agent loop
4. **`src/agents/pi-embedded-subscribe.ts`** (27k lines) - Streaming & tool execution
5. **`src/agents/openclaw-tools.ts`** (279 lines) - Tool catalog creation
6. **`src/config/config.ts`** - Config export (see io.ts for real impl)
7. **`src/config/types.openclaw.ts`** (156 lines) - Main config types
8. **`src/config/sessions.ts`** - Session type exports
9. **`src/config/mcp-config.ts`** (150 lines) - MCP management
10. **`src/gateway/server.ts`** - Gateway server implementation
11. **`src/agents/tool-policy.ts`** (210 lines) - Permission system
12. **`src/cron/service.ts`** - Cron scheduling service
13. **`src/agents/identity.ts`** (171 lines) - Agent identity & prefixes
14. **`src/interactive/payload.ts`** - Interactive reply types
15. **`src/agents/tools/sessions-spawn-tool.ts`** - Subagent spawning

---

## SUMMARY FOR ENTERPRISECLAW JAVA/SPRING BOOT IMPLEMENTATION

**OpenClaw Core Concept:**
A TypeScript-based personal AI assistant that:
- Runs 24/7 on user devices via a gateway daemon
- Routes messages from 20+ messaging channels to a unified agent
- Executes tools (file ops, shell commands, API calls) automatically
- Maintains persistent sessions with conversation history
- Supports subagent delegation for complex tasks
- Implements permission policies for tool access
- Supports scheduled jobs (cron) with retries and delivery
- Integrates with MCP servers for extensibility
- Streams LLM output token-by-token for responsiveness

**EnterpriseClaw Java Reimplementation Should:**
1. **Replicate the agent loop** - Load session, run LLM, execute tools, stream output
2. **Implement tool system** - Built-in tools + plugin tools with policies
3. **Session management** - Persistent storage, compaction, transcript logging
4. **Configuration** - JSON-based config with secrets, model fallbacks, tool policies
5. **Cron service** - Background scheduler with retry logic and delivery
6. **Gateway server** - WebSocket RPC for CLI/mobile clients
7. **Channel integrations** - Support major messaging platforms
8. **Subagent support** - Spawn isolated agents for task delegation
9. **MCP integration** - Bridge to Model Context Protocol servers
10. **Streaming** - Token-by-token output delivery to clients

The architecture is clean, modular, and designed for extensibility through plugins, skills, and channel implementations.