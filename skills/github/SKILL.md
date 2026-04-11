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

Ask the agent about GitHub issues, PRs, or repository activity. The agent will
use the `gh` CLI under the hood.

## Examples

- "What open PRs are there on enterpriseclaw/enterpriseclaw?"
- "Show me issue #42 on myorg/myrepo"
- "Search for authentication bugs in our repo"
