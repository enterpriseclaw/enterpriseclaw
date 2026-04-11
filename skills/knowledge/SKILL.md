---
name: knowledge
description: |
  Organization knowledge base search using vector store. Activate when user
  asks about internal docs, runbooks, architecture decisions, or policies.
tools:
  - name: searchKnowledge
    description: Search the organization's knowledge base for relevant documents
    parameters:
      query: { type: string, description: "Natural language search query" }
      limit: { type: integer, description: "Maximum number of results (default 5)" }
---

# Knowledge Skill

Searches the pgvector-backed knowledge base for relevant organization documents.

## Usage

Ask the agent about internal documentation, architecture decisions, runbooks,
or company policies. The agent will perform a semantic search against the
vector store.

## Examples

- "What's our incident response runbook?"
- "How does the authentication flow work?"
- "Find docs about our deployment process"
