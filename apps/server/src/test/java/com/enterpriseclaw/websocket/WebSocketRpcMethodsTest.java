package com.enterpriseclaw.websocket;

import com.enterpriseclaw.chat.ChatService;
import com.enterpriseclaw.chat.ModelRegistry;
import com.enterpriseclaw.chat.ModelRegistry.AvailableModel;
import com.enterpriseclaw.chat.dto.ChatEvent;
import com.enterpriseclaw.chat.dto.ChatRequest;
import com.enterpriseclaw.chat.dto.SessionSummary;
import com.enterpriseclaw.settings.DiagnosticReport;
import com.enterpriseclaw.settings.DiagnosticService;
import com.enterpriseclaw.skills.SkillRegistry;
import com.enterpriseclaw.websocket.methods.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class WebSocketRpcMethodsTest {

    private ChatService chatService;
    private ModelRegistry modelRegistry;
    private SkillRegistry skillRegistry;
    private DiagnosticService diagnosticService;
    private WebSocketSession session;

    @BeforeEach
    void setUp() {
        chatService = mock(ChatService.class);
        modelRegistry = mock(ModelRegistry.class);
        skillRegistry = mock(SkillRegistry.class);
        diagnosticService = mock(DiagnosticService.class);
        session = mock(WebSocketSession.class);
        when(session.getId()).thenReturn("ws-session-1");
    }

    @Test
    void healthMethod_returnsStatusOk() throws Exception {
        when(diagnosticService.runDiagnostics()).thenReturn(
                new DiagnosticReport("ok", List.of(
                        new DiagnosticReport.DiagnosticCheck("database", "ok", "Connected")
                ))
        );
        HealthMethod method = new HealthMethod(diagnosticService);

        Object result = method.execute(Map.of(), session);

        assertThat(result).isInstanceOf(Map.class);
        @SuppressWarnings("unchecked")
        Map<String, Object> map = (Map<String, Object>) result;
        assertThat(map.get("status")).isEqualTo("ok");
    }

    @Test
    void sessionListMethod_returnsSessions() throws Exception {
        when(chatService.listSessions()).thenReturn(List.of(
                new SessionSummary("s1", "Chat 1", Instant.now())
        ));

        SessionListMethod method = new SessionListMethod(chatService);
        Object result = method.execute(Map.of(), session);

        assertThat(result).isInstanceOf(List.class);
        @SuppressWarnings("unchecked")
        List<SessionSummary> sessions = (List<SessionSummary>) result;
        assertThat(sessions).hasSize(1);
        assertThat(sessions.get(0).sessionId()).isEqualTo("s1");
    }

    @Test
    void sessionCreateMethod_createsSession() throws Exception {
        when(chatService.createSession()).thenReturn(
                new SessionSummary("new-session", null, Instant.now())
        );

        SessionCreateMethod method = new SessionCreateMethod(chatService);
        Object result = method.execute(Map.of(), session);

        assertThat(result).isInstanceOf(SessionSummary.class);
        assertThat(((SessionSummary) result).sessionId()).isEqualTo("new-session");
    }

    @Test
    void sessionDeleteMethod_deletesSession() throws Exception {
        SessionDeleteMethod method = new SessionDeleteMethod(chatService);
        Object result = method.execute(Map.of("sessionId", "s1"), session);

        verify(chatService).deleteSession("s1");
        @SuppressWarnings("unchecked")
        Map<String, Object> map = (Map<String, Object>) result;
        assertThat(map.get("deleted")).isEqualTo(true);
    }

    @Test
    void sessionDeleteMethod_missingSessionId_throws() {
        SessionDeleteMethod method = new SessionDeleteMethod(chatService);

        assertThatThrownBy(() -> method.execute(Map.of(), session))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("sessionId");
    }

    @Test
    void modelsListMethod_returnsAvailableModels() throws Exception {
        when(modelRegistry.getAvailableModels()).thenReturn(List.of(
                new AvailableModel("gpt-4o", "GPT-4o", "openai", true)
        ));

        ModelsListMethod method = new ModelsListMethod(modelRegistry);
        Object result = method.execute(Map.of(), session);

        assertThat(result).isInstanceOf(List.class);
        @SuppressWarnings("unchecked")
        List<AvailableModel> models = (List<AvailableModel>) result;
        assertThat(models).hasSize(1);
        assertThat(models.get(0).id()).isEqualTo("gpt-4o");
    }

    @Test
    void skillsListMethod_returnsSkills() throws Exception {
        when(skillRegistry.getRegisteredSkills()).thenReturn(List.of());

        SkillsListMethod method = new SkillsListMethod(skillRegistry);
        Object result = method.execute(Map.of(), session);

        assertThat(result).isInstanceOf(List.class);
    }

    @Test
    void chatSendMethod_streamsChatEventsToWebSocket() throws Exception {
        ObjectMapper objectMapper = new ObjectMapper();
        ChatSendMethod method = new ChatSendMethod(chatService, objectMapper);

        doAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            Consumer<ChatEvent> sink = invocation.getArgument(1);
            sink.accept(ChatEvent.token("Hello"));
            sink.accept(ChatEvent.done());
            return null;
        }).when(chatService).streamChatToSink(any(ChatRequest.class), any());

        when(session.isOpen()).thenReturn(true);

        Object result = method.execute(
                Map.of("sessionId", "s1", "message", "hi", "model", "gpt-4o"),
                session
        );

        @SuppressWarnings("unchecked")
        Map<String, Object> map = (Map<String, Object>) result;
        assertThat(map.get("status")).isEqualTo("done");

        // Verify WebSocket received notification frames
        verify(session, times(2)).sendMessage(any(TextMessage.class));
    }

    @Test
    void chatSendMethod_missingMessage_throws() {
        ObjectMapper objectMapper = new ObjectMapper();
        ChatSendMethod method = new ChatSendMethod(chatService, objectMapper);

        assertThatThrownBy(() -> method.execute(Map.of("sessionId", "s1"), session))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("message");
    }
}
