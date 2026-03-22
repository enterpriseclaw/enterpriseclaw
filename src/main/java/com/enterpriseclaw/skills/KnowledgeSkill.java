package com.enterpriseclaw.skills;

import org.springframework.ai.tool.annotation.Tool;
import org.springframework.stereotype.Component;

/**
 * Knowledge retrieval skill using Spring AI Generic Agent Skills pattern.
 * Methods annotated with @Tool are automatically exposed as MCP tools/skills.
 */
@Component
public class KnowledgeSkill {

    @Tool(description = "Search the organization's knowledge base for relevant documents and answers")
    public String searchKnowledge(String query) {
        // TODO: Replace with real vector store retrieval
        return String.format("Knowledge search result for: '%s'. [Stub: connect to pgvector for real retrieval]", query);
    }
}
