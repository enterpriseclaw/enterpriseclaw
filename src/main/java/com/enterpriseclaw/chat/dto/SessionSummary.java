package com.enterpriseclaw.chat.dto;

import java.time.Instant;

public record SessionSummary(
        String sessionId,
        String title,
        Instant lastMessageAt
) {}
