package com.enterpriseclaw.audit;

import com.enterpriseclaw.model.ExecutionRequest;
import com.enterpriseclaw.model.ExecutionResult;

/**
 * Audit service for recording all gateway executions.
 */
public interface AuditService {
    void record(ExecutionRequest request, ExecutionResult result);
    void recordToolCall(String userId, String tenantId, String toolName, String sessionId);
    void recordError(String userId, String tenantId, String errorMessage, String sessionId);
    void recordEvent(String userId, String tenantId, String eventType, String details, String sessionId);
}
