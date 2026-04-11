# EnterpriseClaw Documentation

EnterpriseClaw is a browser-first AI agentic platform built with Java/Spring AI, React, and a JLink CLI. It reimplements core OpenClaw concepts -- agent loop, skills-as-folders, WebSocket RPC, CLI -- for enterprise use.

## Guides

| Document | Description |
|----------|-------------|
| [Getting Started](getting-started.md) | Prerequisites, installation, first run |
| [Architecture](architecture.md) | System design, packages, gateway pipeline, dual transport |
| [Providers](providers.md) | LLM provider setup: OpenAI, Anthropic, Ollama, Copilot, Codex |
| [Skills](skills.md) | SKILL.md format, loading, registration, REST API |
| [Channels](channels.md) | Channel connectors: Teams, Telegram, Generic Webhook |
| [CLI](cli.md) | CLI installation, commands, JLink native image |
| [WebSocket RPC](websocket-rpc.md) | JSON-RPC protocol reference for CLI and integrations |
| [Deployment](deployment.md) | Docker, Kamal, PostgreSQL, environment configuration |
| [Testing](testing.md) | Backend and frontend test strategy, running tests |
| [Onboarding](onboarding.md) | Web wizard and CLI setup for first-time users |

## Reference

| Document | Description |
|----------|-------------|
| [Functional Specification](fsd-enterpriseclaw.md) | Full feature spec with user flows and planned endpoints |
| [Technical Requirements](trd-enterpriseclaw.md) | Architecture, deployment, Spring AI integration details |
| [Behavior Specs](specs/) | Implementation specs -- new features start here |

## Quick Links

```bash
# Start development
task local:dev:all

# Run all tests
task local:test:all

# Build everything
task local:build:all
```

- Server: http://localhost:8080
- Frontend: http://localhost:5173
- WebSocket: ws://localhost:8080/ws
- Health check: http://localhost:8080/actuator/health
