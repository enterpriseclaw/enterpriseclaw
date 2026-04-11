package com.enterpriseclaw.websocket.rpc;

import org.springframework.web.socket.WebSocketSession;

import java.util.Map;

public interface RpcMethod {

    String methodName();

    Object execute(Map<String, Object> params, WebSocketSession session) throws Exception;
}
