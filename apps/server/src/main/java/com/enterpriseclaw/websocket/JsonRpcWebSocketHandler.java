package com.enterpriseclaw.websocket;

import com.enterpriseclaw.websocket.rpc.JsonRpcError;
import com.enterpriseclaw.websocket.rpc.JsonRpcRequest;
import com.enterpriseclaw.websocket.rpc.JsonRpcResponse;
import com.enterpriseclaw.websocket.rpc.RpcMethod;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
@Slf4j
public class JsonRpcWebSocketHandler extends TextWebSocketHandler {

    private final ObjectMapper objectMapper;
    private final Map<String, RpcMethod> methods;

    public JsonRpcWebSocketHandler(ObjectMapper objectMapper, List<RpcMethod> rpcMethods) {
        this.objectMapper = objectMapper;
        this.methods = rpcMethods.stream()
                .collect(Collectors.toMap(RpcMethod::methodName, Function.identity()));
        log.info("Registered {} WebSocket RPC methods: {}", methods.size(), methods.keySet());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        JsonRpcRequest request;
        try {
            request = objectMapper.readValue(message.getPayload(), JsonRpcRequest.class);
        } catch (Exception e) {
            sendResponse(session, JsonRpcResponse.error(null, JsonRpcError.PARSE_ERROR, "Invalid JSON-RPC request"));
            return;
        }

        if (request.method() == null || request.method().isBlank()) {
            sendResponse(session, JsonRpcResponse.error(request.id(), JsonRpcError.INVALID_PARAMS, "method is required"));
            return;
        }

        RpcMethod method = methods.get(request.method());
        if (method == null) {
            sendResponse(session, JsonRpcResponse.error(
                    request.id(), JsonRpcError.METHOD_NOT_FOUND,
                    "Method not found: " + request.method()));
            return;
        }

        try {
            Object result = method.execute(
                    request.params() != null ? request.params() : Map.of(),
                    session);
            sendResponse(session, JsonRpcResponse.success(request.id(), result));
        } catch (Exception e) {
            log.error("RPC method '{}' failed", request.method(), e);
            sendResponse(session, JsonRpcResponse.error(
                    request.id(), JsonRpcError.INTERNAL_ERROR,
                    e.getMessage() != null ? e.getMessage() : "Internal error"));
        }
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        log.info("WebSocket connected: {}", session.getId());
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        log.info("WebSocket disconnected: {} ({})", session.getId(), status);
    }

    void sendResponse(WebSocketSession session, JsonRpcResponse response) throws Exception {
        session.sendMessage(new TextMessage(objectMapper.writeValueAsString(response)));
    }
}
