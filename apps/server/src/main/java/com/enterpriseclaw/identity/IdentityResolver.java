package com.enterpriseclaw.identity;

import com.enterpriseclaw.model.IncomingChannelRequest;
import com.enterpriseclaw.model.ResolvedUserIdentity;

/**
 * Resolves a channel user identity to an enterprise user.
 * Channel adapters provide channel-specific user IDs (Slack user ID, Teams AAD ID, etc.)
 * and this service maps them to internal enterprise identities.
 */
public interface IdentityResolver {
    ResolvedUserIdentity resolve(IncomingChannelRequest request);
}
