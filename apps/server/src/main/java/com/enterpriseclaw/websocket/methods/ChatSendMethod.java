package com.enterpriseclaw.websocket.methods;

import com.enterpriseclaw.chat.ChatService;
import com.enterpriseclaw.chat.dto.ChatEvent;
import com.enterpriseclaw.chat.dto.ChatRequest;
import com.enterpriseclaw.websocket.rpc.RpcMethod;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import tools.jackson.databind.ObjectMapper;

import java.util.Map;

/**
 * Streaming RPC method: chat.send.
 * <p>
 * Unlike other RPC methods that return a single result, this one streams
 * intermediate ChatEvent notifications over the WebSocket before returning
 * the final result. The caller receives interleaved notification frames
 * and then one response frame with {"status":"done"}.
 */
@Component
@Slf4j
public class ChatSendMethod implements RpcMethod {

    private final ChatService chatService;
    private final ObjectMapper objectMapper;

    public ChatSendMethod(ChatService chatService, ObjectMapper objectMapper) {
        this.chatService = chatService;
        this.objectMapper = objectMapper;
    }

    @Override
    public String methodName() {
        return "chat.send";
    }

    @Override
    public Object execute(Map<String, Object> params, WebSocketSession session) throws Exception {
        String sessionId = (String) params.get("sessionId");
        String message = (String) params.get("message");
        String model = (String) params.get("model");

        if (sessionId == null || sessionId.isBlank()) {
            throw new IllegalArgumentException("sessionId is required");
        }
        if (message == null || message.isBlank()) {
            throw new IllegalArgumentException("message is required");
        }

        ChatRequest chatRequest = new ChatRequest(sessionId, message, model);

        chatService.streamChatToSink(chatRequest, event -> {
            try {
                Map<String, Object> notification = Map.of(
                        "jsonrpc", "2.0",
                        "method", "chat.event",
                        "params", event
                );
                session.sendMessage(new TextMessage(objectMapper.writeValueAsString(notification)));
            } catch (Exception e) {
                log.warn("Failed to send chat event via WebSocket", e);
            }
        });

        return Map.of("status", "done");
    }
}
