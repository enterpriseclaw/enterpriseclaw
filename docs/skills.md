# Skills

Skills extend the agent's capabilities by defining tools the LLM can invoke during a conversation. They follow the OpenClaw-compatible SKILL.md format.

## What Is a Skill?

A skill is a folder containing a `SKILL.md` file with YAML frontmatter and a markdown body. The frontmatter defines metadata and tool signatures; the body provides documentation the LLM can reference.

## Where Skills Live

Skills are stored in the `skills/` directory at the repository root:

```
skills/
  github/
    SKILL.md
  knowledge/
    SKILL.md
```

The path is configurable via `enterpriseclaw.skills.directory` in `application.yml` (default: `../../skills` relative to the server working directory).

## SKILL.md Format

A complete example:

```markdown
---
name: github
description: |
  GitHub operations via gh CLI. Activate when user mentions issues, PRs,
  repositories, or GitHub workflows.
metadata:
  openclaw:
    emoji: "\U0001F419"
    requires:
      bins: ["gh"]
    install:
      - id: brew
        kind: brew
        formula: gh
        bins: ["gh"]
tools:
  - name: searchIssues
    description: Search GitHub issues and pull requests
    parameters:
      query: { type: string, description: "Search query (GitHub search syntax)" }
      repo: { type: string, description: "owner/repo" }
  - name: getIssue
    description: Get details of a specific issue or PR
    parameters:
      repo: { type: string, description: "owner/repo" }
      number: { type: integer, description: "Issue or PR number" }
  - name: listPrs
    description: List open pull requests for a repository
    parameters:
      repo: { type: string, description: "owner/repo" }
      state: { type: string, description: "open, closed, or all" }
---

# GitHub Skill

Provides read-only GitHub context: issue search, PR listing, issue details.

## Usage

Ask the agent about GitHub issues, PRs, or repository activity.

## Examples

- "What open PRs are there on enterpriseclaw/enterpriseclaw?"
- "Show me issue #42 on myorg/myrepo"
- "Search for authentication bugs in our repo"
```

### Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Unique skill identifier |
| `description` | Yes | What the skill does (shown to LLM for activation) |
| `metadata` | No | OpenClaw-compatible metadata (emoji, requirements, install) |
| `tools` | No | List of tool definitions with name, description, and parameters |

### Tool Definition

Each tool in the `tools` list has:

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Tool function name |
| `description` | Yes | What the tool does (sent to LLM) |
| `parameters` | No | Map of parameter name to `{type, description}` |

## How Skills Are Loaded

The `SkillLoader` component:

1. Runs at startup (`@PostConstruct`).
2. Scans every subdirectory of `enterpriseclaw.skills.directory`.
3. Looks for a `SKILL.md` file in each subdirectory.
4. Splits YAML frontmatter from the markdown body.
5. Parses the frontmatter with SnakeYAML.
6. Stores each skill as a `LoadedSkill` record:

```java
public record LoadedSkill(
    String name,
    String description,
    String markdownBody,
    List<ToolDefinition> tools
) {
    public record ToolDefinition(
        String name, String description, Map<String, Object> parameters
    ) {}
}
```

## How Skills Become Spring AI Tools

Two mechanisms register tools with the LLM:

### Built-in Skills

`GitHubSkill`, `KnowledgeSkill`, and `IncidentSkill` are Spring `@Component` classes with `@Tool` annotations. They are registered via `MethodToolCallbackProvider` in `ChatClientConfiguration`.

### Dynamic Skills (SKILL.md)

The `SkillsTool` from spring-ai-agent-utils reads the skills directory and creates `FunctionCallback` instances. It is registered as a `ToolCallback` bean and included in every `ChatClient`.

## REST API

All endpoints are under `/api/v1/skills`.

### List Skills

```
GET /api/v1/skills
```

Response:

```json
[
  {
    "name": "github",
    "description": "GitHub operations via gh CLI...",
    "toolCount": 3,
    "provider": "github"
  }
]
```

### Get Skill Detail

```
GET /api/v1/skills/{name}
```

Response:

```json
{
  "name": "github",
  "description": "GitHub operations via gh CLI...",
  "markdownBody": "# GitHub Skill\n...",
  "tools": [
    {
      "name": "searchIssues",
      "description": "Search GitHub issues and pull requests",
      "parameters": {
        "query": {"type": "string", "description": "Search query"},
        "repo": {"type": "string", "description": "owner/repo"}
      }
    }
  ],
  "provider": "github"
}
```

### Create Skill

```
POST /api/v1/skills
Content-Type: application/json

{
  "name": "my-skill",
  "content": "---\nname: my-skill\ndescription: Does something\n---\n\n# My Skill\n..."
}
```

Returns `201 Created` with the skill detail. Returns `409 Conflict` if the skill already exists.

### Update Skill

```
PUT /api/v1/skills/{name}
Content-Type: application/json

{
  "content": "---\nname: my-skill\ndescription: Updated description\n---\n\n# My Skill\n..."
}
```

### Delete Skill

```
DELETE /api/v1/skills/{name}
```

Returns `204 No Content`.

### Rescan Skills Directory

```
POST /api/v1/skills/rescan
```

Response:

```json
{"count": 2}
```

Clears all loaded skills and re-reads from disk.

## Creating a New Skill

Step by step:

1. Create a directory under `skills/`:

   ```bash
   mkdir skills/my-skill
   ```

2. Create `skills/my-skill/SKILL.md`:

   ```markdown
   ---
   name: my-skill
   description: |
     Brief description of what this skill does.
     This text is shown to the LLM to decide when to activate the skill.
   tools:
     - name: myTool
       description: What this tool does
       parameters:
         input: { type: string, description: "The input value" }
   ---

   # My Skill

   Detailed documentation. The LLM can reference this during conversations.

   ## Usage

   Describe when and how to use this skill.
   ```

3. Trigger a rescan:

   ```bash
   # Via REST API
   curl -X POST http://localhost:8080/api/v1/skills/rescan

   # Via CLI
   ec skills rescan
   ```

4. Verify it loaded:

   ```bash
   ec skills list
   ```

## OpenClaw Compatibility

The SKILL.md format is compatible with OpenClaw. The `metadata.openclaw` section supports:

- `emoji` -- display icon
- `requires.bins` -- required system binaries
- `install` -- installation instructions (brew, apt, etc.)

These fields are parsed and stored but currently used only for display purposes.
