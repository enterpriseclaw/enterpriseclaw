# EnterpriseClaw — MVP Scenarios

## Scenario 1: Knowledge Retrieval

**"Ask in Slack/Web and get answer from approved files/logs/db"**

| Attribute | Value |
|---|---|
| Trigger channel | Web, Slack (v2) |
| Input example | "What is our incident response process?" |
| Identity used | Channel user → enterprise user → role |
| Allowed tools | `knowledge.search`, `file.read` |
| Expected output | Answer with source reference |
| Approval needed | No |

### Flow

1. User asks question in web chat or Slack
2. Channel adapter normalizes to `IncomingChannelRequest`
3. Identity resolved from channel user ID
4. Policy engine evaluates `knowledge.search` tool access
5. Knowledge retrieval skill invoked via `@Tool`
6. Answer formatted and returned
7. Audit event persisted

---

## Scenario 2: Incident Summarize

**"Incident read-and-summarize from logs + deployment context"**

| Attribute | Value |
|---|---|
| Trigger channel | Web, Slack (v2) |
| Input example | "Summarize incident INC-2024-001" |
| Identity used | DevOps role required |
| Allowed tools | `logs.fetch`, `db.read` |
| Expected output | Summary with probable cause, recent deploys, next safe steps |
| Approval needed | No (read-only) |

### Flow

1. User provides incident ID
2. Identity resolved, DevOps role verified
3. Logs fetched for affected service
4. Deployment history retrieved
5. AI summarizes probable cause
6. Response formatted with action items
7. Audit persisted

---

## Scenario 3: GitHub/Jira Assistant

**"Read-only context retrieval for GitHub issues and PRs"**

| Attribute | Value |
|---|---|
| Trigger channel | Web, CLI |
| Input example | "Summarize the context of PR #1234" |
| Identity used | Developer role |
| Allowed tools | `github.read`, `jira.read` |
| Expected output | PR summary with linked issues, CI status, reviewer comments |
| Approval needed | No (read-only) |

### Flow

1. User asks about a specific GitHub PR or Jira ticket
2. Identity and developer role verified
3. GitHub/Jira read tool invoked
4. Context compiled (PR description, linked issues, CI results)
5. AI synthesizes a readable summary
6. Response returned, audit persisted
