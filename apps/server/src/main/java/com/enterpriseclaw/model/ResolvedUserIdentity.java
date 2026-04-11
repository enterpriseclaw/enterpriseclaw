package com.enterpriseclaw.model;

import java.util.Set;

/**
 * Enterprise user resolved from a channel identity.
 */
public record ResolvedUserIdentity(
        String userId,
        String email,
        String displayName,
        String tenantId,
        Set<String> roles
) {
    public boolean hasRole(String role) {
        return roles != null && roles.contains(role);
    }
}
