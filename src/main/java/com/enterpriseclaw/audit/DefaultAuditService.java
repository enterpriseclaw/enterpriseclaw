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

    @Override
    public void record(ExecutionRequest request, ExecutionResult result) {
        try {
            String userId = request.identity() != null ? request.identity().userId() : "unknown";
            String tenantId = request.channelRequest().tenantId();
            String details = String.format("channel=%s success=%s latency=%dms tools=%s skills=%s",
                    request.channelRequest().channel(),
                    result.success(),
                    result.latencyMs(),
                    result.toolsInvoked(),
                    result.skillsActivated());

            recordEvent(userId, tenantId, "EXECUTION", details, request.sessionId());
        } catch (Exception e) {
            log.warn("Failed to record audit event", e);
        }
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
