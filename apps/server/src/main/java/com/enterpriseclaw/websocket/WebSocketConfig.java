package com.enterpriseclaw.websocket;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final JsonRpcWebSocketHandler jsonRpcHandler;

    public WebSocketConfig(JsonRpcWebSocketHandler jsonRpcHandler) {
        this.jsonRpcHandler = jsonRpcHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(jsonRpcHandler, "/ws")
                .setAllowedOrigins("*");
    }
}
