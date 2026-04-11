package com.enterpriseclaw.chat.dto;

import com.enterpriseclaw.chat.MessageRole;
import java.time.Instant;

public record MessageSummary(
        String id,
        MessageRole role,
        String content,
        Instant createdAt
) {}
