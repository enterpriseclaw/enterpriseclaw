# CLI Reference

The EnterpriseClaw CLI (`ec`) is a standalone Java application that communicates with the server over WebSocket JSON-RPC. It provides terminal access to chat, sessions, skills, and diagnostics.

## Installation

### Build from Source

```bash
cd apps/cli
task build
```

This produces a standard JAR. Run with:

```bash
java -jar build/libs/cli-*.jar <command>
```

### JLink Native Image

For a self-contained native image (~25MB, no JVM required):

```bash
cd apps/cli
task jlink
```

The output binary is `ec` and can be placed on your `PATH`.

### Verify Installation

```bash
ec --version
# EnterpriseClaw CLI 0.0.1-SNAPSHOT
```

## Configuration

The CLI connects to the server via WebSocket. The default URL is `ws://localhost:8080/ws`.

Override with the `--server` flag on any command:

```bash
ec doctor --server ws://myserver:8080/ws
```

## Commands

### ec agent

Send a message to the AI agent and stream the response.

```bash
ec agent "What can you help me with?"
```

**Options:**

| Flag | Short | Description | Default |
|------|-------|-------------|---------|
| `--model` | `-m` | Model to use (e.g., `copilot:gpt-4.1`) | Server default |
| `--session` | `-s` | Session ID to continue | Creates new session |
| `--server` | | Server WebSocket URL | `ws://localhost:8080/ws` |

**Examples:**

```bash
# Use a specific model
ec agent "Explain this error" --model copilot:gpt-4.1

# Continue an existing session
ec agent "And what about the second point?" --session abc-123-def

# Custom server
ec agent "Hello" --server ws://production:8080/ws
```

**Behavior:**

1. If no `--session` is provided, creates a new session via `session.create`.
2. Sends the message via `chat.send` with streaming.
3. Prints token events to stdout as they arrive.
4. Exits when the stream completes.

### ec sessions

List or delete chat sessions.

```bash
# List all sessions
ec sessions list

# Delete a session
ec sessions delete abc-123-def
```

**Output (list):**

```
SESSION ID                            CREATED               STATUS
--------------------------------------------------------------------------------
abc-123-def                           2026-04-11T10:00:00Z  ACTIVE
xyz-456-ghi                           2026-04-10T08:30:00Z  ACTIVE
```

### ec skills

Manage available skills.

```bash
# List all skills
ec skills list

# Show skill details
ec skills show github

# Rescan skills directory
ec skills rescan
```

**Output (list):**

```
NAME                            DESCRIPTION
--------------------------------------------------------------------------------
github                          GitHub operations via gh CLI...
knowledge                       Knowledge base search...
```

**Output (show):**

```
Name:        github
Description: GitHub operations via gh CLI...
Provider:    github

Tools:
  - searchIssues: Search GitHub issues and pull requests
  - getIssue: Get details of a specific issue or PR
  - listPrs: List open pull requests for a repository

# GitHub Skill
...
```

### ec doctor

Check server health and connectivity.

```bash
ec doctor
```

**Output:**

```
Server: ws://localhost:8080/ws
Status: UP
Version: 0.0.1-SNAPSHOT
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `--server` | Server WebSocket URL | `ws://localhost:8080/ws` |

### ec setup

First-run onboarding and diagnostics. Checks server connectivity, lists available models and providers, runs diagnostic checks, and provides guidance.

```bash
ec setup
```

**Output:**

```
EnterpriseClaw Setup
====================

Server: ws://localhost:8080/ws
Status: UP
Version: 0.0.1-SNAPSHOT

Available Models:
  MODEL                          PROVIDER        STATUS
  -----                          --------        ------
  GPT-4.1                        openai          ready
  Copilot GPT-4.1                copilot         ready
  Llama 3.2                      ollama          unavailable

Diagnostics:
  [OK]   database -- Connected
  [OK]   openai -- API key configured
  [WARN] anthropic -- No API key
  [OK]   copilot -- GitHub token available
  [WARN] ollama -- Ollama not reachable
  [OK]   skills -- 2 skill(s) loaded

Ready! Try: ec agent 'hello world'
```

## WebSocket JSON-RPC Protocol

The CLI communicates with the server using JSON-RPC 2.0 over WebSocket. Each command maps to one or more RPC methods:

| CLI Command | RPC Methods Used |
|-------------|-----------------|
| `ec agent` | `session.create`, `chat.send` |
| `ec sessions list` | `session.list` |
| `ec sessions delete` | `session.delete` |
| `ec skills list` | `skills.list` |
| `ec skills show` | `skills.detail` |
| `ec skills rescan` | `skills.rescan` |
| `ec doctor` | `health` |
| `ec setup` | `health`, `models.list` |

See [WebSocket RPC](websocket-rpc.md) for the full protocol reference.

## JLink Details

The CLI uses JLink to produce a minimal custom Java runtime. The image includes only the modules needed by the application:

- No full JDK required on the target machine
- Self-contained binary (~25MB)
- Cross-platform (build on your target OS)

The JLink configuration is in the CLI's `build.gradle` and `Taskfile.yml`.
