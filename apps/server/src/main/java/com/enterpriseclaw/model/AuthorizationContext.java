package com.enterpriseclaw.model;

import java.util.Set;

/**
 * Evaluated authorization context: what this user is allowed to do.
 */
public record AuthorizationContext(
        ResolvedUserIdentity identity,
        Set<String> allowedTools,
        Set<String> allowedSkills,
        boolean approvalRequired,
        String denyReason
) {
    public boolean isDenied() { return denyReason != null; }
    public boolean isAllowed() { return denyReason == null; }
}
