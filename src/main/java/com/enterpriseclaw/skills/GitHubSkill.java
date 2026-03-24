package com.enterpriseclaw.skills;

import org.springframework.ai.tool.annotation.Tool;
import org.springframework.stereotype.Component;

/**
 * GitHub read-only context assistant skill.
 */
@Component
public class GitHubSkill {

    @Tool(description = "Summarize the history and context of a GitHub issue or pull request")
    public String summarizeIssue(String repoAndIssue) {
        // TODO: Replace with real GitHub MCP tool invocation
        return String.format("Issue summary for '%s': [Stub] Title, description, comments, and linked PRs.", repoAndIssue);
    }

    @Tool(description = "Explain the context and failures of a pull request including linked issues and CI results")
    public String explainPr(String repoAndPr) {
        // TODO: Replace with real GitHub MCP tool invocation
        return String.format("PR context for '%s': [Stub] CI status, changed files, reviewer comments.", repoAndPr);
    }
}
