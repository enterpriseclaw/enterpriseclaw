package com.enterpriseclaw.gateway;

import com.enterpriseclaw.audit.AuditService;
import com.enterpriseclaw.chat.ChatService;
import com.enterpriseclaw.chat.dto.ChatEvent;
import com.enterpriseclaw.chat.dto.ChatRequest;
import com.enterpriseclaw.identity.IdentityResolver;
import com.enterpriseclaw.model.*;
import com.enterpriseclaw.policy.PolicyEngine;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.function.Consumer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GatewayPipelineTest {

    @Mock IdentityResolver identityResolver;
    @Mock PolicyEngine policyEngine;
    @Mock AuditService auditService;
    @Mock ChatService chatService;

    EnterpriseGatewayService gateway;

    private static final ResolvedUserIdentity SOLO_IDENTITY =
            new ResolvedUserIdentity("solo", "solo@example.com", "Solo User", "default", Set.of("admin", "user"));

    @BeforeEach
    void setUp() {
        gateway = new EnterpriseGatewayService(identityResolver, policyEngine, auditService, chatService);
    }

    @Test
    void execute_runsFullPipeline_identityThenPolicyThenChatThenAudit() {
        IncomingChannelRequest channelRequest = new IncomingChannelRequest(
                "req-1", ChannelType.WEB, "solo", null, "Hello AI",
                "default", Instant.now(), Map.of("model", "gpt-4.1"));

        given(identityResolver.resolve(channelRequest)).willReturn(SOLO_IDENTITY);
        given(policyEngine.getVisibleTools(SOLO_IDENTITY, "WEB")).willReturn(Set.of("file.read"));
        given(policyEngine.getVisibleSkills(SOLO_IDENTITY, "WEB")).willReturn(Set.of("code-review"));

        // Simulate ChatService streaming tokens and a tool call
        doAnswer(invocation -> {
            Consumer<ChatEvent> sink = invocation.getArgument(1);
            sink.accept(ChatEvent.token("Hi "));
            sink.accept(ChatEvent.token("there!"));
            sink.accept(ChatEvent.toolCall("file.read"));
            sink.accept(ChatEvent.done());
            return null;
        }).when(chatService).streamChatToSink(any(ChatRequest.class), any());

        ExecutionResult result = gateway.execute(channelRequest);

        assertThat(result.success()).isTrue();
        assertThat(result.response()).isEqualTo("Hi there!");
        assertThat(result.toolsInvoked()).containsExactly("file.read");
        assertThat(result.requestId()).isEqualTo("req-1");

        // Verify pipeline order: identity → policy → chat → audit
        var inOrder = inOrder(identityResolver, policyEngine, chatService, auditService);
        inOrder.verify(identityResolver).resolve(channelRequest);
        inOrder.verify(policyEngine).getVisibleTools(SOLO_IDENTITY, "WEB");
        inOrder.verify(chatService).streamChatToSink(any(), any());
        inOrder.verify(auditService).record(any(ExecutionRequest.class), any(ExecutionResult.class));
    }

    @Test
    void execute_recordsFailureOnException() {
        IncomingChannelRequest channelRequest = new IncomingChannelRequest(
                "req-2", ChannelType.WEB, "solo", null, "Fail please",
                "default", Instant.now(), Map.of());

        given(identityResolver.resolve(channelRequest)).willReturn(SOLO_IDENTITY);
        given(policyEngine.getVisibleTools(SOLO_IDENTITY, "WEB")).willReturn(Set.of());
        given(policyEngine.getVisibleSkills(SOLO_IDENTITY, "WEB")).willReturn(Set.of());

        doThrow(new RuntimeException("LLM unavailable"))
                .when(chatService).streamChatToSink(any(), any());

        ExecutionResult result = gateway.execute(channelRequest);

        assertThat(result.success()).isFalse();
        assertThat(result.errorMessage()).isEqualTo("LLM unavailable");
        verify(auditService).record(any(ExecutionRequest.class), any(ExecutionResult.class));
    }

    @Test
    void executeAuthorized_delegatesToChatServiceWithCorrectModel() {
        IncomingChannelRequest channelRequest = new IncomingChannelRequest(
                "req-3", ChannelType.CLI, "solo", null, "What time is it?",
                "default", Instant.now(), Map.of("model", "ollama:llama3.2"));

        ExecutionRequest execRequest = new ExecutionRequest(
                channelRequest, SOLO_IDENTITY,
                new AuthorizationContext(SOLO_IDENTITY, Set.of(), Set.of(), false, null),
                "session-abc");

        doAnswer(invocation -> {
            Consumer<ChatEvent> sink = invocation.getArgument(1);
            sink.accept(ChatEvent.token("It is noon."));
            sink.accept(ChatEvent.done());
            return null;
        }).when(chatService).streamChatToSink(any(ChatRequest.class), any());

        ExecutionResult result = gateway.executeAuthorized(execRequest);

        assertThat(result.success()).isTrue();
        assertThat(result.response()).isEqualTo("It is noon.");

        ArgumentCaptor<ChatRequest> captor = ArgumentCaptor.forClass(ChatRequest.class);
        verify(chatService).streamChatToSink(captor.capture(), any());
        assertThat(captor.getValue().model()).isEqualTo("ollama:llama3.2");
        assertThat(captor.getValue().sessionId()).isEqualTo("session-abc");
    }
}
