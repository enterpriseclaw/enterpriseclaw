# EnterpriseClaw — Execution Pipeline

## Pipeline Overview

Every request (from any channel) goes through the same pipeline:

```
Channel Input (Slack / Teams / Web / CLI)
       ↓
IncomingChannelRequest (normalized)
       ↓
Identity Resolution
  → IdentityResolver.resolve(request)
  → Returns ResolvedUserIdentity { userId, email, roles, tenantId }
       ↓
Policy Evaluation
  → PolicyEngine.getVisibleTools(identity, channel)
  → PolicyEngine.getVisibleSkills(identity, channel)
  → Returns AuthorizationContext { allowedTools, allowedSkills }
       ↓
ExecutionRequest built (channel + identity + authorization)
       ↓
MCP / Skill Invocation
  → SkillRegistry.invoke(skill, input)
  → OR McpInvocationService.invoke(tool, input)
       ↓
Response Formatting (channel-specific)
       ↓
Audit Event Persisted
  → AuditService.record(request, result)
       ↓
ExecutionResult returned to channel
```

## Key Interfaces

| Interface | Responsibility |
|---|---|
| `ExecutionPipeline` | Orchestrates the full pipeline |
| `IdentityResolver` | Maps channel user to enterprise identity |
| `PolicyEngine` | Evaluates tool/skill access policies |
| `AuditService` | Persists audit events |
| `SkillRegistry` | Registry of @Tool-annotated skills |

## Audit Data Captured

Every execution records:
- Who asked (userId, channel)
- From which channel (Slack, Teams, Web, CLI)
- What message was sent
- Which tools were visible
- Which tools were actually invoked
- Allow/deny decision
- Failure reason (if any)
- Latency (ms)
- Model used (if applicable)
