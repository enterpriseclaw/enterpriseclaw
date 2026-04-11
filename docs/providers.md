# LLM Providers

EnterpriseClaw supports five LLM providers. All are configured as Spring AI `ChatClient` beans sharing the same tool pipeline, so every provider has access to the same skills and tools.

## Overview

| Provider | ChatModel Class | Auth | Detection | Model Prefix |
|----------|----------------|------|-----------|-------------|
| OpenAI | `OpenAiChatModel` | API key in `.env` | Key non-empty | (none) |
| Anthropic | `AnthropicChatModel` | API key in `.env` | Key non-empty | `claude` |
| Ollama | `OllamaChatModel` | None | HTTP probe to localhost:11434 | `ollama:` |
| Copilot | `OpenAiChatModel` | `gh auth token` | gh CLI returns token | `copilot:` |
| Codex | `OpenAiChatModel` | `~/.codex/auth.json` | auth.json exists | `codex:` |

The `auto` provider setting (default) picks the first available provider in order: OpenAI, Anthropic, Copilot, Codex, Ollama.

## OpenAI

### Setup

Add your API key to `.env`:

```bash
OPENAI_API_KEY=sk-...
```

### Available Models

| Model ID | Display Name |
|----------|-------------|
| `gpt-4.1` | GPT-4.1 |
| `gpt-4o` | GPT-4o |
| `gpt-4o-mini` | GPT-4o Mini |
| `o3-mini` | o3-mini |

### How It Works

Spring AI auto-configures `OpenAiChatModel` when `spring.ai.openai.api-key` is set. The `ChatClientConfiguration` wraps it in a `ChatClient` bean with all registered tool callbacks.

## Anthropic

### Setup

Add your API key to `.env`:

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

### Available Models

| Model ID | Display Name |
|----------|-------------|
| `claude-sonnet-4-5-20250929` | Claude Sonnet 4.5 |
| `claude-opus-4-20250514` | Claude Opus 4 |
| `claude-haiku-3-5-20241022` | Claude Haiku 3.5 |

### How It Works

Spring AI auto-configures `AnthropicChatModel` when `spring.ai.anthropic.api-key` is set. Models starting with `claude` are routed to this provider automatically.

## Ollama

### Setup

Install and run Ollama:

```bash
brew install ollama
ollama serve
```

Pull a model:

```bash
ollama pull llama3.2
```

No API key required. The server probes `http://localhost:11434` on startup to detect availability.

### Available Models

| Model ID | Display Name |
|----------|-------------|
| `ollama:llama3.2` | Llama 3.2 |
| `ollama:qwen2.5` | Qwen 2.5 |
| `ollama:mistral` | Mistral |

### Configuration

The Ollama base URL can be changed in `application.yml`:

```yaml
spring:
  ai:
    ollama:
      base-url: http://localhost:11434
```

## GitHub Copilot

### Setup

Authenticate with the GitHub CLI:

```bash
gh auth login
```

Verify it works:

```bash
gh auth token
```

No additional configuration needed. The server automatically detects an authenticated `gh` CLI.

### Available Models

| Model ID | Display Name |
|----------|-------------|
| `copilot:gpt-4.1` | Copilot GPT-4.1 |
| `copilot:gpt-5-mini` | Copilot GPT-5 Mini |
| `copilot:claude-sonnet-4` | Copilot Claude Sonnet 4 |
| `copilot:claude-opus-4.5` | Copilot Claude Opus 4.5 |
| `copilot:gemini-2.5-pro` | Copilot Gemini 2.5 Pro |

### How It Works

The `CopilotTokenProvider` runs `gh auth token` to obtain a GitHub token. This token is refreshed every 30 minutes. The token is used to authenticate against the Copilot API at `https://api.githubcopilot.com`.

The Copilot provider creates an `OpenAiChatModel` with:

- **Base URL:** `https://api.githubcopilot.com`
- **Completions path:** `/chat/completions`
- **Extra header:** `Openai-Intent: conversation-edits`
- **API key:** GitHub token from `gh auth token`

This works because the Copilot API implements the OpenAI chat completions protocol.

### Requirements

- GitHub Copilot subscription (Individual, Business, or Enterprise)
- `gh` CLI installed and authenticated
- `enterpriseclaw.chat.copilot.enabled: true` (default)

## Codex

### Setup

Authenticate with Codex CLI so that `~/.codex/auth.json` exists:

```bash
codex auth login
```

The auth file should contain:

```json
{
  "tokens": {
    "access_token": "eyJ..."
  }
}
```

### Available Models

| Model ID | Display Name |
|----------|-------------|
| `codex:gpt-5.4` | Codex GPT-5.4 |
| `codex:gpt-5.4-mini` | Codex GPT-5.4 Mini |
| `codex:gpt-5.3-codex` | Codex GPT-5.3 |
| `codex:gpt-5.2-codex` | Codex GPT-5.2 |

### How It Works

The `CodexTokenProvider` reads `~/.codex/auth.json` and extracts the `access_token`. It watches the file modification time and re-reads when the file changes.

The Codex provider creates an `OpenAiChatModel` with:

- **Base URL:** `https://api.openai.com`
- **API key:** JWT from `~/.codex/auth.json`

## Model Prefixes and Routing

Model IDs use prefixes to route to the correct provider:

| Prefix | Provider | Example |
|--------|----------|---------|
| (none) | OpenAI | `gpt-4.1` |
| `claude*` | Anthropic | `claude-sonnet-4-5-20250929` |
| `ollama:` | Ollama | `ollama:llama3.2` |
| `copilot:` | Copilot | `copilot:gpt-4.1` |
| `codex:` | Codex | `codex:gpt-5.4` |

The prefix is stripped before sending to the upstream API. For example, `copilot:gpt-4.1` sends `gpt-4.1` to the Copilot API.

## Dynamic Model Registry

The `ModelRegistry` probes all providers on startup and caches the results. The frontend fetches available models dynamically -- no hardcoded model list.

### API Endpoints

**Get available models (only providers that are online):**

```
GET /api/v1/settings/models
```

```json
[
  {"id": "gpt-4.1", "displayName": "GPT-4.1", "provider": "openai", "available": true},
  {"id": "copilot:gpt-4.1", "displayName": "Copilot GPT-4.1", "provider": "copilot", "available": true}
]
```

**Get all models (including unavailable):**

```
GET /api/v1/settings/models/all
```

**Get provider status:**

```
GET /api/v1/settings/providers
```

```json
[
  {"provider": "openai", "available": true, "reason": "API key configured"},
  {"provider": "anthropic", "available": false, "reason": "No API key"},
  {"provider": "ollama", "available": false, "reason": "Ollama not reachable"},
  {"provider": "copilot", "available": true, "reason": "GitHub token available"},
  {"provider": "codex", "available": false, "reason": "Codex auth file not found"}
]
```

**Force refresh (re-probe all providers):**

```
POST /api/v1/settings/models/refresh
```

## Adding a New Provider

To add a new OpenAI-compatible provider:

1. Create a token provider class (if auth is needed) similar to `CopilotTokenProvider`.
2. Add a `@Bean @Qualifier("myProviderChatClient")` method in `ChatClientConfiguration` that creates an `OpenAiChatModel` with the custom base URL.
3. Add model entries to `ProviderModels.MODELS`.
4. Add detection logic to `ModelRegistry.refresh()`.
5. Add the provider key to the `ChatService` routing logic.

For non-OpenAI-compatible APIs, implement a new `ChatModel` or use the appropriate Spring AI starter.
