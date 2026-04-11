package com.enterpriseclaw.websocket.methods;

import com.enterpriseclaw.chat.ChatService;
import com.enterpriseclaw.websocket.rpc.RpcMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import java.util.Map;

@Component
public class SessionCreateMethod implements RpcMethod {

    private final ChatService chatService;

    public SessionCreateMethod(ChatService chatService) {
        this.chatService = chatService;
    }

    @Override
    public String methodName() {
        return "session.create";
    }

    @Override
    public Object execute(Map<String, Object> params, WebSocketSession session) {
        return chatService.createSession();
    }
}
