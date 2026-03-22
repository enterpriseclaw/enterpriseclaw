package com.enterpriseclaw.policy;

/**
 * Result of a policy evaluation.
 */
public record PolicyDecision(
        boolean allowed,
        boolean approvalRequired,
        String reason
) {
    public static PolicyDecision allow() {
        return new PolicyDecision(true, false, null);
    }

    public static PolicyDecision allowWithApproval(String reason) {
        return new PolicyDecision(true, true, reason);
    }

    public static PolicyDecision deny(String reason) {
        return new PolicyDecision(false, false, reason);
    }
}
