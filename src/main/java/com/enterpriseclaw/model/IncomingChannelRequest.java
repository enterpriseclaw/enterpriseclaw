package com.enterpriseclaw.model;

import java.time.Instant;
import java.util.Map;

/**
 * Normalized request from any channel (Slack, Teams, Web, CLI).
 * All channel adapters must produce this shape before passing to the gateway.
 */
public record IncomingChannelRequest(
        String requestId,
        ChannelType channel,
        String channelUserId,
        String channelThreadId,
        String message,
        String tenantId,
        Instant receivedAt,
        Map<String, String> metadata
) {
    public static IncomingChannelRequest fromWeb(String requestId, String userId, String message, String tenantId) {
        return new IncomingChannelRequest(requestId, ChannelType.WEB, userId, null, message, tenantId, Instant.now(), Map.of());
    }
}
