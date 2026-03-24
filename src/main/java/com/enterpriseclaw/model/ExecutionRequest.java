package com.enterpriseclaw.model;

/**
 * A fully authorized and enriched request ready for MCP invocation.
 */
public record ExecutionRequest(
        IncomingChannelRequest channelRequest,
        ResolvedUserIdentity identity,
        AuthorizationContext authorization,
        String sessionId
) {}
