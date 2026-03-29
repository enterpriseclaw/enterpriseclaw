# Spring AI Agentic Patterns — Reference Guide

> Compiled from the official Spring Blog series (Jan 2026) for EnterpriseClaw development.
> Source: https://spring.io/blog/2026/01/13/spring-ai-generic-agent-skills

---

## Version Matrix (as of March 2026)

| Library | Version | Status |
|---|---|---|
| **Spring AI** | `2.0.0-M3` | Milestone (GA ~May 2026) |
| **Spring Boot** | `4.0.0-RC2` | Release candidate |
| **spring-ai-agent-utils** | `0.5.0` | Stable, on Maven Central |
| **spring-ai-a2a-server-autoconfigure** | `0.2.0` | A2A server integration |
| **a2a-java-sdk-client** | `0.3.3.Final` | A2A client SDK |
| **Java** | 21+ | Required minimum |

### Gradle Dependencies

```groovy
// BOM
implementation platform('org.springframework.ai:spring-ai-bom:2.0.0-M3')

// Core Spring AI starters
implementation 'org.springframework.ai:spring-ai-starter-model-openai'
implementation 'org.springframework.ai:spring-ai-starter-model-anthropic'
implementation 'org.springframework.ai:spring-ai-starter-mcp-server'
implementation 'org.springframework.ai:spring-ai-starter-mcp-client'
implementation 'org.springframework.ai:spring-ai-starter-vector-store-pgvector'

// Agent Utils (SkillsTool, AskUserQuestionTool, TodoWriteTool, TaskTool)
implementation 'org.springaicommunity:spring-ai-agent-utils:0.5.0'

// A2A Protocol (optional)
implementation 'org.springaicommunity:spring-ai-a2a-server-autoconfigure:0.2.0'
implementation 'io.github.a2asdk:a2a-java-sdk-client:0.3.3.Final'
```

### Breaking Changes from Spring AI 1.0 → 2.0

| Area | 1.x | 2.0.0-M3 |
|---|---|---|
| Jackson | `com.fasterxml.jackson.*` | `tools.jackson.*` |
| MCP annotations | `org.springaicommunity.mcp.annotation` | `org.springframework.ai.mcp.annotation` (core) |
| Model options | Mix of constructors/builders | Standardized builder pattern |
| Claude models | Claude 3 Opus/Sonnet/Haiku | Claude 4.x (new IDs) |
| Chat memory | In ToolContext | Removed from ToolContext; use MessageChatMemoryAdvisor |
| Anthropic SDK | REST client | Official Java SDK |
| Java baseline | Java 17+ | Java 21+ |
| Spring Boot | 3.x | 4.x / Spring Framework 7 |
| `disableMemory()` | Available | Renamed to `disableInternalConversationHistory()` |
| MCP customizers | Separate sync/async | Merged into `McpClientCustomizer<B>` |

> **Migration tool available:** OpenRewrite recipe at `spring-ai/src/rewrite/migrate-to-2-0-0-M3.yaml`

---

## Part 1: Agent Skills (SkillsTool)

> Source: https://spring.io/blog/2026/01/13/spring-ai-generic-agent-skills

### What Are Agent Skills?

Modular folders of instructions, scripts, and resources that AI agents discover and load on demand. Instead of hardcoding knowledge into prompts or creating specialized tools for every task, skills provide a flexible, LLM-portable way to extend agent capabilities.

### Skill Directory Structure

```
.claude/skills/my-skill/
├── SKILL.md          # Required: YAML frontmatter + instructions
├── scripts/          # Optional: executable code
├── references/       # Optional: documentation
└── assets/           # Optional: templates, resources
```

### SKILL.md Format

```markdown
---
name: code-reviewer
description: Reviews Java code for best practices, security issues, and Spring conventions.
---

# Code Reviewer

## Instructions
When reviewing code:
1. Check for security vulnerabilities
2. Verify Spring Boot best practices
3. Look for potential null pointer exceptions
4. Suggest improvements for readability
5. Provide specific line-by-line feedback with code examples
```

Frontmatter must have `name` and `description` at minimum. Supports complex YAML (lists, nested objects).

### Three-Step Lifecycle

1. **Discovery (startup)** — Scans skills directories, parses YAML frontmatter, extracts name + description into a lightweight registry embedded in the tool description. Hundreds of skills → lean context window.
2. **Semantic Matching (conversation)** — LLM examines skill descriptions and invokes `Skill` tool when a user request matches.
3. **Execution (on invocation)** — Full `SKILL.md` content loaded from disk. LLM follows instructions, using `Read` (FileSystemTools) or `Bash` (ShellTools) to access referenced files/scripts on demand.

### Core Tools

| Tool | Purpose | Required? |
|---|---|---|
| **SkillsTool** | Discover and load skills | Yes |
| **FileSystemTools** | Read files referenced by skills | Optional |
| **ShellTools** | Execute scripts bundled with skills | Optional |

### Code Example

```java
@Bean
CommandLineRunner demo(ChatClient.Builder chatClientBuilder) {
    return args -> {
        ChatClient chatClient = chatClientBuilder
            .defaultToolCallbacks(SkillsTool.builder()
                .addSkillsDirectory(".claude/skills")
                .build())
            .defaultTools(FileSystemTools.builder().build())
            .defaultTools(ShellTools.builder().build())
            .build();

        String response = chatClient.prompt()
            .user("Review this controller for best practices")
            .call()
            .content();
    };
}
```

### Production: Load from Classpath

```java
.defaultToolCallbacks(SkillsTool.builder()
    .addSkillsResource(resourceLoader.getResource("classpath:.claude/skills"))
    .build())
```

### Key Points for EnterpriseClaw

- Skills are LLM-agnostic — define once, use with OpenAI, Anthropic, Gemini
- Scripts execute locally without sandboxing — consider containerized deployment
- No built-in human-in-the-loop — implement via custom ToolCallback wrapper
- No built-in versioning — use directory structure (`v1/`, `v2/`) if needed
- Spec: https://agentskills.io/specification

---

## Part 2: AskUserQuestionTool

> Source: https://spring.io/blog/2026/01/16/spring-ai-ask-user-question-tool

### What It Does

Allows AI agents to ask clarifying questions *before* answering. Transforms agents from assumption-based responders into collaborative partners that gather requirements interactively.

### Question-Answer Workflow

1. **AI generates questions** — Constructs questions with header, text, 2-4 options, multiSelect flag
2. **User provides answers** — Custom handler receives questions, presents via UI, collects answers
3. **Repeat if needed** — Additional rounds of clarification
4. **AI continues with context** — Delivers tailored response on first attempt

### Question Features

- **Single-select or multi-select** — Choose one option or combine multiple
- **Free-text input** — Users can always provide custom text beyond predefined options
- **Rich context** — Every option includes a description with trade-offs

### Code Example

```java
ChatClient chatClient = chatClientBuilder
    .defaultTools(AskUserQuestionTool.builder()
        .questionHandler(this::handleQuestions)
        .build())
    .build();
```

### Console-Based QuestionHandler

```java
private static Map<String, String> handleQuestions(List<Question> questions) {
    Map<String, String> answers = new HashMap<>();
    Scanner scanner = new Scanner(System.in);

    for (Question q : questions) {
        System.out.println("\n" + q.header() + ": " + q.question());

        for (int i = 0; i < q.options().size(); i++) {
            Option opt = q.options().get(i);
            System.out.printf("  %d. %s - %s%n", i + 1, opt.label(), opt.description());
        }

        System.out.println(q.multiSelect()
            ? "  (Enter numbers separated by commas, or type custom text)"
            : "  (Enter a number, or type custom text)");

        String response = scanner.nextLine().trim();

        try {
            String[] parts = response.split(",");
            List<String> labels = new ArrayList<>();
            for (String part : parts) {
                int index = Integer.parseInt(part.trim()) - 1;
                if (index >= 0 && index < q.options().size()) {
                    labels.add(q.options().get(index).label());
                }
            }
            answers.put(q.question(), labels.isEmpty() ? response : String.join(", ", labels));
        } catch (NumberFormatException e) {
            answers.put(q.question(), response);
        }
    }
    return answers;
}
```

### Web-Based QuestionHandler (for EnterpriseClaw)

For web applications, use `CompletableFuture` to bridge async UI interactions:
- Send questions to frontend via WebSocket/SSE
- Block on `future.get()`
- Complete the future when user submits answers via REST endpoint

### Key Points for EnterpriseClaw

- Maps directly to our `POST /chat` NDJSON `"question"` event type
- Handler bridges to our existing SSE/NDJSON streaming
- `POST /chat/{sessionId}/answer` endpoint submits the user's answer
- Related to MCP Elicitation (`@McpElicitation` annotation) for server-driven scenarios

---

## Part 3: TodoWriteTool

> Source: https://spring.io/blog/2026/01/20/spring-ai-agentic-patterns-3-todowrite/

### What It Does

Enables LLMs to create, track, and update task lists during execution. Transforms implicit planning into explicit, trackable workflows. Prevents "lost in the middle" failures where agents skip steps in long contexts.

### Todo Item Lifecycle

```
pending → in_progress → completed
                      ↘ cancelled
```

**Constraint:** Only one task can be `in_progress` at a time — forces sequential, focused execution.

### When the LLM Uses It

The tool description tells the LLM:
> "Use this tool when a task requires 3 or more distinct steps. Skip for single straightforward tasks."

The agent decides autonomously based on complexity.

### Code Example

```java
ChatClient chatClient = chatClientBuilder
    .defaultTools(TodoWriteTool.builder().build())
    .defaultAdvisors(
        ToolCallAdvisor.builder().conversationHistoryEnabled(false).build(),
        MessageChatMemoryAdvisor.builder(
            MessageWindowChatMemory.builder().build()
        ).build())
    .build();
```

**Important:** Setting `conversationHistoryEnabled(false)` disables built-in tool-call history in favor of `MessageChatMemoryAdvisor`.

### Event-Driven Progress Updates

```java
// Custom event
public class TodoUpdateEvent extends ApplicationEvent {
    private final List<TodoItem> todos;
    // constructor, getter...
}

// Listener
@Component
public class TodoProgressListener {
    @EventListener
    public void onTodoUpdate(TodoUpdateEvent event) {
        int completed = (int) event.getTodos().stream()
            .filter(t -> t.status() == Todos.Status.completed).count();
        int total = event.getTodos().size();
        System.out.printf("\nProgress: %d/%d tasks completed (%.0f%%)\n",
            completed, total, (completed * 100.0 / total));
    }
}

// Wire into ChatClient
ChatClient chatClient = chatClientBuilder
    .defaultTools(TodoWriteTool.builder()
        .todoEventHandler(event ->
            applicationEventPublisher.publishEvent(
                new TodoUpdateEvent(this, event.todos())))
        .build())
    .build();
```

### Key Points for EnterpriseClaw

- Can publish progress events to frontend via SSE/NDJSON
- Requires Chat Memory (MessageChatMemoryAdvisor) + ToolCallAdvisor
- Use system prompt with task management instructions (see `MAIN_AGENT_SYSTEM_PROMPT_V2`)
- Maps to our Dashboard/Observability features for tracking agent task execution

---

## Part 4: Subagent Orchestration (TaskTool)

> Source: https://spring.io/blog/2026/01/27/spring-ai-agentic-patterns-4-task-subagents

### What It Does

Hierarchical multi-agent architecture where specialized subagents handle focused tasks in dedicated context windows. Only essential results return to the parent — keeps the main agent lean.

### Architecture

1. **Main Agent (Orchestrator)** — Interacts with users, has access to `Task` tool, knows subagents via Agent Registry
2. **Agent Configuration Files** — Markdown files in `agents/` folder with YAML frontmatter
3. **Subagents** — Separate instances with isolated context, can use different LLMs

### Built-in Subagents

| Subagent | Purpose | Tools |
|---|---|---|
| **Explore** | Fast, read-only codebase exploration | Read, Grep, Glob |
| **General-Purpose** | Multi-step research + execution (read/write) | All tools |
| **Plan** | Software architect for strategies | Read-only + search |
| **Bash** | Command execution specialist | Bash only |

### Custom Subagent Definition

```markdown
---
name: code-reviewer
description: Expert code reviewer. Use proactively after writing code.
tools: Read, Grep, Glob
disallowedTools: Edit, Write
model: sonnet
---

You are a senior code reviewer with expertise in software quality.

**When Invoked:**
1. Run `git diff` to see recent changes
2. Focus analysis on modified files
3. Check surrounding code context

**Review Checklist:**
- Code clarity and readability
- Error handling
- Security vulnerabilities

**Output:** Clear, actionable feedback with file references.
```

### Configuration Fields

| Field | Required | Description |
|---|---|---|
| `name` | Yes | Unique ID (lowercase-hyphens) |
| `description` | Yes | When to use this subagent |
| `tools` | No | Allowed tools (inherits all if omitted) |
| `disallowedTools` | No | Explicitly denied tools |
| `model` | No | `haiku`, `sonnet`, `opus` |

### Code Example

```java
var taskTools = TaskToolCallbackProvider.builder()
    .chatClientBuilder("default", chatClientBuilder)
    .subagentReferences(
        ClaudeSubagentReferences.fromRootDirectory("src/main/resources/agents"))
    .build();

ChatClient chatClient = chatClientBuilder
    .defaultToolCallbacks(taskTools)
    .build();
```

### Multi-Model Routing

```java
var taskTools = TaskToolCallbackProvider.builder()
    .chatClientBuilder("default", sonnetBuilder)   // Default
    .chatClientBuilder("haiku", haikuBuilder)      // Fast, cheap
    .chatClientBuilder("opus", opusBuilder)        // Complex analysis
    .build();
```

### Key Points for EnterpriseClaw

- Subagents **cannot** spawn their own subagents
- Supports parallel execution — multiple subagents concurrently
- Background execution with `TaskOutputTool` for long-running tasks
- Maps to our planned multi-model support in Settings page

---

## Part 5: A2A Integration (Agent2Agent Protocol)

> Source: https://spring.io/blog/2026/01/29/spring-ai-agentic-patterns-a2a-integration

### What It Does

Open standard for AI agent communication across platforms. Agents discover capabilities, exchange messages, and coordinate workflows regardless of implementation.

### Key Concepts

- **AgentCard** — JSON at `/.well-known/agent-card.json` describing identity, capabilities, skills
- **A2A Server** — Exposes endpoints for discovery + message handling
- **A2A Client** — Initiates communication, discovers remote agents, sends messages
- **Flow:** Discovery → Initiation → Completion

### Auto-Configured Endpoints

```
POST   /                                  # Handle JSON-RPC sendMessage
GET    /.well-known/agent-card.json      # Agent card (standard A2A)
GET    /card                              # Agent card (alternative)
```

### Server Example

```java
@Bean
public AgentCard agentCard(@Value("${server.port:8080}") int port,
        @Value("${server.servlet.context-path:/}") String contextPath) {
    return new AgentCard.Builder()
        .name("Weather Agent")
        .description("Provides weather information for cities")
        .url("http://localhost:" + port + contextPath + "/")
        .version("1.0.0")
        .capabilities(new AgentCapabilities.Builder().streaming(false).build())
        .skills(List.of(new AgentSkill.Builder()
            .id("weather_search").name("Search weather")
            .description("Get temperature for any city")
            .build()))
        .protocolVersion("0.3.0")
        .build();
}

@Bean
public AgentExecutor agentExecutor(ChatClient.Builder chatClientBuilder) {
    ChatClient chatClient = chatClientBuilder.clone()
        .defaultSystem("You are a weather assistant.")
        .build();

    return new DefaultAgentExecutor(chatClient, (chat, requestContext) -> {
        String userMessage = DefaultAgentExecutor.extractTextFromMessage(
            requestContext.getMessage());
        return chat.prompt().user(userMessage).call().content();
    });
}
```

### Key Points for EnterpriseClaw

- Future feature: expose EnterpriseClaw agents as A2A servers
- Enable external agents to discover and interact with our skills
- Multi-agent orchestration across services
- Currently server-focused; client auto-config coming

---

## Complete Tool Summary for EnterpriseClaw

| Tool | Library | Purpose | Priority |
|---|---|---|---|
| **SkillsTool** | spring-ai-agent-utils | Discover & load `.claude/skills/` | 🔴 Sprint 3 |
| **AskUserQuestionTool** | spring-ai-agent-utils | Interactive mid-chat questions | 🔴 Sprint 3 |
| **FileSystemTools** | spring-ai-agent-utils | Read files referenced by skills | 🟡 Sprint 3-4 |
| **ShellTools** | spring-ai-agent-utils | Execute skill scripts | 🟡 Sprint 4 |
| **TodoWriteTool** | spring-ai-agent-utils | Multi-step task tracking | 🟢 Sprint 4-5 |
| **TaskTool** | spring-ai-agent-utils | Subagent orchestration | 🟢 Future |
| **A2A Server** | spring-ai-a2a | Expose agents as A2A endpoints | 🔵 Future |

---

## Resources

### Official Blog Series
1. [Agent Skills](https://spring.io/blog/2026/01/13/spring-ai-generic-agent-skills) — Part 1
2. [AskUserQuestionTool](https://spring.io/blog/2026/01/16/spring-ai-ask-user-question-tool) — Part 2
3. [TodoWriteTool](https://spring.io/blog/2026/01/20/spring-ai-agentic-patterns-3-todowrite/) — Part 3
4. [Subagent Orchestration](https://spring.io/blog/2026/01/27/spring-ai-agentic-patterns-4-task-subagents) — Part 4
5. [A2A Integration](https://spring.io/blog/2026/01/29/spring-ai-agentic-patterns-a2a-integration) — Part 5

### GitHub Repositories
- [spring-ai-agent-utils](https://github.com/spring-ai-community/spring-ai-agent-utils)
- [spring-ai-a2a](https://github.com/spring-ai-community/spring-ai-a2a)
- [Spring AI](https://github.com/spring-projects/spring-ai)

### Example Projects
- [skills-demo](https://github.com/spring-ai-community/spring-ai-agent-utils/tree/main/examples/skills-demo)
- [ask-user-question-demo](https://github.com/spring-ai-community/spring-ai-agent-utils/tree/main/examples/ask-user-question-demo)
- [todo-demo](https://github.com/spring-ai-community/spring-ai-agent-utils/tree/main/examples/todo-demo)
- [code-agent-demo](https://github.com/spring-ai-community/spring-ai-agent-utils/tree/main/examples/code-agent-demo)
- [subagent-demo](https://github.com/spring-ai-community/spring-ai-agent-utils/tree/main/examples/subagent-demo)

### Specifications
- [Agent Skills Spec](https://agentskills.io/specification)
- [A2A Protocol](https://a2a-protocol.org/)
- [Spring AI Reference Docs](https://docs.spring.io/spring-ai/reference/)

### Related Spring AI Features
- [Dynamic Tool Discovery](https://spring.io/blog/2025/12/11/spring-ai-tool-search-tools-tzolov) — 34-64% token savings
- [Tool Argument Augmentation](https://spring.io/blog/2025/12/23/spring-ai-tool-argument-augmenter-tzolov) — Capture LLM reasoning
- [Anthropic Skills (cloud-sandboxed)](https://spring.io/blog/2026/01/spring-ai-anthropic-agent-skills)
