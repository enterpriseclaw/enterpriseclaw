# EnterpriseClaw — Non-Goals (v1)

These are explicitly **out of scope** for v1. They prevent over-engineering.

## We Are NOT Building

1. **A new MCP spec** — We consume MCP as-is. We do not modify tool definitions.

2. **A custom tool DSL** — Tools are defined as Spring AI `@Tool` methods or MCP server tools. No custom DSL.

3. **A custom skill DSL** — Skills follow the Spring AI Generic Agent Skills pattern. No proprietary skill format.

4. **A plugin marketplace in v1** — Skills and tools are registered manually. No marketplace UI.

5. **Full autonomous agents in v1** — We orchestrate read-first, supervised AI. No autonomous multi-step agents.

6. **Channel parity in v1** — Slack and web first. Teams adapter is phase 2. We do not aim for all channels simultaneously.

7. **Write actions first** — All v1 tools are read-only. Write/action tools require approval architecture first.

8. **Generic LLM framework** — We use Spring AI as our LLM abstraction. We do not build our own.

9. **Vector search everywhere** — PGVector is set up for future use. We do not block MVP on RAG.

10. **Multi-agent orchestration** — Single-agent execution per request. Multi-agent is future.

## Why This Matters

These boundaries prevent scope creep and ensure we ship scenarios, not frameworks.

The product is **scenarios working end-to-end**, not a perfectly modular architecture that does nothing.
