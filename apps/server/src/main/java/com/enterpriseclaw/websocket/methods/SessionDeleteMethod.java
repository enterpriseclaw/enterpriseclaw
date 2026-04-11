package com.enterpriseclaw.websocket.methods;

import com.enterpriseclaw.chat.ChatService;
import com.enterpriseclaw.websocket.rpc.RpcMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import java.util.Map;

@Component
public class SessionDeleteMethod implements RpcMethod {

    private final ChatService chatService;

    public SessionDeleteMethod(ChatService chatService) {
        this.chatService = chatService;
    }

    @Override
    public String methodName() {
        return "session.delete";
    }

    @Override
    public Object execute(Map<String, Object> params, WebSocketSession session) {
        String sessionId = (String) params.get("sessionId");
        if (sessionId == null || sessionId.isBlank()) {
            throw new IllegalArgumentException("sessionId is required");
        }
        chatService.deleteSession(sessionId);
        return Map.of("deleted", true);
    }
}
