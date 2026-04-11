package com.enterpriseclaw.policy;

import com.enterpriseclaw.model.ResolvedUserIdentity;

import java.util.Set;

/**
 * Evaluates access policies for tools and skills.
 *
 * Policies control:
 * - Which tools/skills a user can see and invoke
 * - Whether approval is required for certain actions
 * - Channel-level access restrictions
 */
public interface PolicyEngine {

    /**
     * Evaluate whether a user can invoke a specific tool.
     */
    PolicyDecision evaluateTool(ResolvedUserIdentity identity, String toolName, String channel);

    /**
     * Evaluate whether a user can activate a specific skill.
     */
    PolicyDecision evaluateSkill(ResolvedUserIdentity identity, String skillName, String channel);

    /**
     * Get the set of tools visible to a user in a given channel.
     */
    Set<String> getVisibleTools(ResolvedUserIdentity identity, String channel);

    /**
     * Get the set of skills visible to a user in a given channel.
     */
    Set<String> getVisibleSkills(ResolvedUserIdentity identity, String channel);
}
