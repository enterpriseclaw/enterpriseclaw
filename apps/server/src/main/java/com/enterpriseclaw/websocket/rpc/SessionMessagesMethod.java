package com.enterpriseclaw.websocket.rpc;

import com.enterpriseclaw.chat.ChatService;
import com.enterpriseclaw.chat.dto.MessageSummary;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class SessionMessagesMethod implements RpcMethod {

    private final ChatService chatService;

    @Override
    public String methodName() {
        return "session.messages";
    }

    @Override
    public Object execute(Map<String, Object> params, WebSocketSession session) {
        String sessionId = (String) params.get("sessionId");
        if (sessionId == null || sessionId.isBlank()) {
            throw new IllegalArgumentException("sessionId is required");
        }
        int limit = params.containsKey("limit") ? ((Number) params.get("limit")).intValue() : 50;
        int offset = params.containsKey("offset") ? ((Number) params.get("offset")).intValue() : 0;

        List<MessageSummary> messages = chatService.getSessionMessages(sessionId, limit, offset);
        return messages;
    }
}
