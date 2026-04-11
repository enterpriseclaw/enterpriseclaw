package com.enterpriseclaw.identity;

import com.enterpriseclaw.model.IncomingChannelRequest;
import com.enterpriseclaw.model.ResolvedUserIdentity;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Set;

/**
 * In-memory identity resolver for solo mode / development.
 * Maps well-known channel user IDs to enterprise identities.
 * In production, replace with DB-backed or LDAP-backed implementation.
 */
@Service
public class InMemoryIdentityResolver implements IdentityResolver {

    private static final Map<String, ResolvedUserIdentity> IDENTITIES = Map.of(
            "solo",    new ResolvedUserIdentity("solo", "solo@example.com", "Solo User", "default", Set.of("admin", "user")),
            "admin",   new ResolvedUserIdentity("admin", "admin@example.com", "Admin", "default", Set.of("admin", "user")),
            "default", new ResolvedUserIdentity("default", "user@example.com", "Default User", "default", Set.of("user"))
    );

    @Override
    public ResolvedUserIdentity resolve(IncomingChannelRequest request) {
        String channelUserId = request.channelUserId();
        if (channelUserId == null || channelUserId.isBlank()) {
            channelUserId = "solo";
        }
        return IDENTITIES.getOrDefault(channelUserId,
                new ResolvedUserIdentity(channelUserId, channelUserId + "@example.com",
                        channelUserId, request.tenantId(), Set.of("user")));
    }
}
