package com.enterpriseclaw.websocket.methods;

import com.enterpriseclaw.chat.ModelRegistry;
import com.enterpriseclaw.websocket.rpc.RpcMethod;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import java.util.Map;

@Component
@RequiredArgsConstructor
public class ModelsListMethod implements RpcMethod {

    private final ModelRegistry modelRegistry;

    @Override
    public String methodName() {
        return "models.list";
    }

    @Override
    public Object execute(Map<String, Object> params, WebSocketSession session) {
        return modelRegistry.getAvailableModels();
    }
}
