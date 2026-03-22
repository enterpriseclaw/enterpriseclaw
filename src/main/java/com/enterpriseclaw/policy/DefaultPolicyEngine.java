package com.enterpriseclaw.policy;

import com.enterpriseclaw.model.ResolvedUserIdentity;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Set;

/**
 * Default policy engine.
 *
 * Policy rules:
 * - admin role: access to all tools
 * - user role: access to read-only tools
 * - Write/action tools always require approval
 */
@Service
@Slf4j
public class DefaultPolicyEngine implements PolicyEngine {

    /** Read-only tools available to all authenticated users */
    private static final Set<String> READ_TOOLS = Set.of(
            "file.read", "db.read", "logs.fetch",
            "github.read", "jira.read", "knowledge.search"
    );

    /** Tools that require admin role */
    private static final Set<String> ADMIN_TOOLS = Set.of(
            "user.manage", "policy.update", "tenant.admin"
    );

    /** Tools that require approval (write/action tools) */
    private static final Set<String> APPROVAL_REQUIRED_TOOLS = Set.of(
            "service.restart", "email.send", "db.write", "file.write",
            "incident.create", "deploy.trigger"
    );

    /** Skills available in solo mode */
    private static final Set<String> DEFAULT_SKILLS = Set.of(
            "knowledge-retrieval", "incident-summarize", "code-review",
            "github-assistant", "jira-assistant"
    );

    @Override
    public PolicyDecision evaluateTool(ResolvedUserIdentity identity, String toolName, String channel) {
        if (identity == null) {
            return PolicyDecision.deny("No identity resolved");
        }
        if (APPROVAL_REQUIRED_TOOLS.contains(toolName)) {
            return identity.hasRole("admin")
                    ? PolicyDecision.allowWithApproval("Write action requires approval")
                    : PolicyDecision.deny("Insufficient role for action tool: " + toolName);
        }
        if (ADMIN_TOOLS.contains(toolName)) {
            return identity.hasRole("admin")
                    ? PolicyDecision.allow()
                    : PolicyDecision.deny("Admin role required for: " + toolName);
        }
        if (READ_TOOLS.contains(toolName)) {
            return PolicyDecision.allow();
        }
        log.debug("Unknown tool '{}', defaulting to allow for role user", toolName);
        return identity.hasRole("user") ? PolicyDecision.allow() : PolicyDecision.deny("User role required");
    }

    @Override
    public PolicyDecision evaluateSkill(ResolvedUserIdentity identity, String skillName, String channel) {
        if (identity == null) {
            return PolicyDecision.deny("No identity resolved");
        }
        return DEFAULT_SKILLS.contains(skillName) || identity.hasRole("admin")
                ? PolicyDecision.allow()
                : PolicyDecision.deny("Skill not available: " + skillName);
    }

    @Override
    public Set<String> getVisibleTools(ResolvedUserIdentity identity, String channel) {
        if (identity == null) return Set.of();
        return READ_TOOLS;
    }

    @Override
    public Set<String> getVisibleSkills(ResolvedUserIdentity identity, String channel) {
        if (identity == null) return Set.of();
        return DEFAULT_SKILLS;
    }
}
