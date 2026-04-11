package com.enterpriseclaw.gateway;

import com.enterpriseclaw.audit.AuditService;
import com.enterpriseclaw.chat.ChatService;
import com.enterpriseclaw.chat.dto.ChatEvent;
import com.enterpriseclaw.chat.dto.ChatRequest;
import com.enterpriseclaw.identity.IdentityResolver;
import com.enterpriseclaw.model.*;
import com.enterpriseclaw.policy.PolicyEngine;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * Core enterprise gateway orchestrator.
 *
 * Implements the full execution pipeline:
 * Channel Input → Identity → Policy → Skills/Tools → Response → Audit
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EnterpriseGatewayService implements ExecutionPipeline {

    private final IdentityResolver identityResolver;
    private final PolicyEngine policyEngine;
    private final AuditService auditService;
    private final ChatService chatService;

    @Override
    public ExecutionResult execute(IncomingChannelRequest request) {
        log.debug("Gateway processing request: channel={} requestId={}", request.channel(), request.requestId());

        // 1. Resolve identity
        ResolvedUserIdentity identity = identityResolver.resolve(request);
        log.debug("Identity resolved: userId={} roles={}", identity.userId(), identity.roles());

        // 2. Evaluate policy
        Set<String> visibleTools = policyEngine.getVisibleTools(identity, request.channel().name());
        Set<String> visibleSkills = policyEngine.getVisibleSkills(identity, request.channel().name());

        AuthorizationContext authorization = new AuthorizationContext(
                identity, visibleTools, visibleSkills, false, null
        );

        // 3. Build execution request
        ExecutionRequest execRequest = new ExecutionRequest(request, identity, authorization, null);

        return executeAuthorized(execRequest);
    }

    @Override
    public ExecutionResult executeAuthorized(ExecutionRequest request) {
        long start = System.currentTimeMillis();
        List<String> toolsInvoked = new ArrayList<>();
        List<String> skillsActivated = new ArrayList<>();

        try {
            // 4. Delegate to ChatService for LLM execution
            String sessionId = request.sessionId();
            String model = request.channelRequest().metadata().getOrDefault("model", null);
            ChatRequest chatRequest = new ChatRequest(
                    sessionId != null ? sessionId : "gateway-" + request.channelRequest().requestId(),
                    request.channelRequest().message(),
                    model
            );

            StringBuilder responseBuilder = new StringBuilder();
            chatService.streamChatToSink(chatRequest, event -> {
                switch (event.type()) {
                    case "token" -> responseBuilder.append(event.text());
                    case "tool_call" -> toolsInvoked.add(event.tool());
                    case "error" -> log.warn("Chat error during gateway execution: {}", event.message());
                }
            });

            long latency = System.currentTimeMillis() - start;
            ExecutionResult result = ExecutionResult.success(
                    request.channelRequest().requestId(), responseBuilder.toString(),
                    toolsInvoked, skillsActivated, latency);

            // 5. Audit
            auditService.record(request, result);
            return result;

        } catch (Exception ex) {
            long latency = System.currentTimeMillis() - start;
            log.error("Gateway execution failed for request {}", request.channelRequest().requestId(), ex);
            ExecutionResult failure = ExecutionResult.failure(
                    request.channelRequest().requestId(), ex.getMessage(), latency);
            auditService.record(request, failure);
            return failure;
        }
    }
}
