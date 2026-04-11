package com.enterpriseclaw.model;

import java.time.Instant;
import java.util.List;

/**
 * Result of processing an ExecutionRequest through the gateway pipeline.
 */
public record ExecutionResult(
        String requestId,
        String response,
        boolean success,
        String errorMessage,
        List<String> toolsInvoked,
        List<String> skillsActivated,
        long latencyMs,
        Instant completedAt
) {
    public static ExecutionResult success(String requestId, String response, List<String> tools, List<String> skills, long latency) {
        return new ExecutionResult(requestId, response, true, null, tools, skills, latency, Instant.now());
    }

    public static ExecutionResult failure(String requestId, String error, long latency) {
        return new ExecutionResult(requestId, null, false, error, List.of(), List.of(), latency, Instant.now());
    }
}
