package com.enterpriseclaw.chat.dto;

import jakarta.validation.constraints.NotBlank;

public record AnswerRequest(
        @NotBlank String sessionId,
        @NotBlank String questionId,
        @NotBlank String answer
) {}
