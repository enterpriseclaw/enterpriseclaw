package com.enterpriseclaw.websocket;

import com.enterpriseclaw.settings.DiagnosticReport;
import com.enterpriseclaw.settings.DiagnosticService;
import com.enterpriseclaw.websocket.methods.HealthMethod;
import com.enterpriseclaw.websocket.rpc.JsonRpcError;
import com.enterpriseclaw.websocket.rpc.JsonRpcResponse;
import com.enterpriseclaw.websocket.rpc.RpcMethod;
import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.*;

class JsonRpcWebSocketHandlerTest {

    private JsonRpcWebSocketHandler handler;
    private ObjectMapper objectMapper;
    private WebSocketSession session;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        DiagnosticService diagnosticService = mock(DiagnosticService.class);
        when(diagnosticService.runDiagnostics()).thenReturn(
                new DiagnosticReport("ok", List.of(new DiagnosticReport.DiagnosticCheck("database", "ok", "Connected"))));
        List<RpcMethod> methods = List.of(new HealthMethod(diagnosticService));
        handler = new JsonRpcWebSocketHandler(objectMapper, methods);
        session = mock(WebSocketSession.class);
        when(session.getId()).thenReturn("test-session");
    }

    @Test
    void healthMethodReturnsOk() throws Exception {
        String request = objectMapper.writeValueAsString(Map.of(
                "jsonrpc", "2.0",
                "method", "health",
                "id", "1"
        ));

        handler.handleTextMessage(session, new TextMessage(request));

        verify(session).sendMessage(argThat(msg -> {
            String payload = ((TextMessage) msg).getPayload();
            try {
                JsonRpcResponse response = objectMapper.readValue(payload, JsonRpcResponse.class);
                assertThat(response.id()).isEqualTo("1");
                assertThat(response.error()).isNull();
                assertThat(response.result()).isNotNull();
                @SuppressWarnings("unchecked")
                Map<String, Object> result = (Map<String, Object>) response.result();
                assertThat(result.get("status")).isEqualTo("ok");
                return true;
            } catch (Exception e) {
                return false;
            }
        }));
    }

    @Test
    void unknownMethodReturnsMethodNotFound() throws Exception {
        String request = objectMapper.writeValueAsString(Map.of(
                "jsonrpc", "2.0",
                "method", "nonexistent.method",
                "id", "2"
        ));

        handler.handleTextMessage(session, new TextMessage(request));

        verify(session).sendMessage(argThat(msg -> {
            String payload = ((TextMessage) msg).getPayload();
            try {
                JsonRpcResponse response = objectMapper.readValue(payload, JsonRpcResponse.class);
                assertThat(response.id()).isEqualTo("2");
                assertThat(response.error()).isNotNull();
                assertThat(response.error().code()).isEqualTo(JsonRpcError.METHOD_NOT_FOUND);
                assertThat(response.error().message()).contains("nonexistent.method");
                return true;
            } catch (Exception e) {
                return false;
            }
        }));
    }

    @Test
    void malformedJsonReturnsParseError() throws Exception {
        handler.handleTextMessage(session, new TextMessage("{invalid json"));

        verify(session).sendMessage(argThat(msg -> {
            String payload = ((TextMessage) msg).getPayload();
            try {
                JsonRpcResponse response = objectMapper.readValue(payload, JsonRpcResponse.class);
                assertThat(response.error()).isNotNull();
                assertThat(response.error().code()).isEqualTo(JsonRpcError.PARSE_ERROR);
                return true;
            } catch (Exception e) {
                return false;
            }
        }));
    }

    @Test
    void missingMethodReturnsInvalidParams() throws Exception {
        String request = objectMapper.writeValueAsString(Map.of(
                "jsonrpc", "2.0",
                "id", "3"
        ));

        handler.handleTextMessage(session, new TextMessage(request));

        verify(session).sendMessage(argThat(msg -> {
            String payload = ((TextMessage) msg).getPayload();
            try {
                JsonRpcResponse response = objectMapper.readValue(payload, JsonRpcResponse.class);
                assertThat(response.error()).isNotNull();
                assertThat(response.error().code()).isEqualTo(JsonRpcError.INVALID_PARAMS);
                return true;
            } catch (Exception e) {
                return false;
            }
        }));
    }
}
