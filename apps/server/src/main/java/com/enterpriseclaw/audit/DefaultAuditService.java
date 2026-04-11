package com.enterpriseclaw.audit;

import com.enterpriseclaw.model.ExecutionRequest;
import com.enterpriseclaw.model.ExecutionResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class DefaultAuditService implements AuditService {

    private final AuditEventRepository auditEventRepository;
    private final AgentRunLogRepository agentRunLogRepository;

    @Override
    public void record(ExecutionRequest request, ExecutionResult result) {
        try {
            String userId = request.identity() != null ? request.identity().userId() : "unknown";
            String tenantId = request.channelRequest().tenantId();
            String sessionId = request.sessionId();
            String model = request.channelRequest().metadata().getOrDefault("model", "unknown");

            String details = String.format("channel=%s model=%s success=%s latency=%dms tools=%s skills=%s",
                    request.channelRequest().channel(),
                    model,
                    result.success(),
                    result.latencyMs(),
                    result.toolsInvoked(),
                    result.skillsActivated());

            recordEvent(userId, tenantId, "EXECUTION", details, sessionId);

            // Record individual tool call events
            for (String tool : result.toolsInvoked()) {
                recordToolCall(userId, tenantId, tool, sessionId);
            }

            // Record error event if execution failed
            if (!result.success() && result.errorMessage() != null) {
                recordError(userId, tenantId, result.errorMessage(), sessionId);
            }

            // Record agent run log
            AgentRunLog runLog = AgentRunLog.builder()
                    .id(UUID.randomUUID().toString())
                    .sessionId(sessionId != null ? sessionId : "unknown")
                    .userId(userId)
                    .durationMs(result.latencyMs())
                    .skillActivated(result.skillsActivated().isEmpty() ? null : String.join(",", result.skillsActivated()))
                    .build();
            agentRunLogRepository.save(runLog);

        } catch (Exception e) {
            log.warn("Failed to record audit event", e);
        }
    }

    @Override
    public void recordToolCall(String userId, String tenantId, String toolName, String sessionId) {
        recordEvent(userId, tenantId, "TOOL_CALL", "tool=" + toolName, sessionId);
    }

    @Override
    public void recordError(String userId, String tenantId, String errorMessage, String sessionId) {
        recordEvent(userId, tenantId, "ERROR", errorMessage, sessionId);
    }

    @Override
    public void recordEvent(String userId, String tenantId, String eventType, String details, String sessionId) {
        AuditEvent event = AuditEvent.builder()
                .id(UUID.randomUUID().toString())
                .userId(userId)
                .eventType(eventType)
                .details(details)
                .sessionId(sessionId)
                .build();
        auditEventRepository.save(event);
    }
}
