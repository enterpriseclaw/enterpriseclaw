# EnterpriseClaw — Product Definition

> EnterpriseClaw is the enterprise gateway for MCP, bringing AI into Slack, Teams, web, and CLI with identity-aware access, policy control, and auditability.

## What This Is

EnterpriseClaw is a **gateway and control plane** that sits between your enterprise users (in Slack, Teams, web, or CLI) and MCP-compatible AI tools and skills.

It does **not** replace MCP. It **wraps** MCP with enterprise trust:
- Who is asking?
- Are they allowed to use this tool or skill?
- Should this require approval?
- Was everything audited?

## Core Value Proposition

| Without EnterpriseClaw | With EnterpriseClaw |
|---|---|
| AI tools exposed to everyone | Policy-filtered tools per role/channel |
| No identity | Enterprise user mapped from any channel |
| No audit trail | Every invocation audited |
| Manual approval | Approval workflow built in |
| One channel only | Slack + Teams + Web + CLI unified |

## Technology Stack

- **Backend**: Java 21 + Spring Boot 4 + Spring AI 1.0
- **Database**: H2 (solo) / PostgreSQL + pgvector (team)
- **AI**: OpenAI / Anthropic via Spring AI
- **Skills**: Spring AI Generic Agent Skills (@Tool pattern)
- **MCP**: Spring AI MCP Server + Client
