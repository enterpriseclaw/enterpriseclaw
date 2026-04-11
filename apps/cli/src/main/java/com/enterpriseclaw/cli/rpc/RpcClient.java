package com.enterpriseclaw.cli.rpc;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Consumer;

public class RpcClient {

    private final String serverUrl;
    private final ObjectMapper mapper = new ObjectMapper();
    private final AtomicInteger idCounter = new AtomicInteger(1);

    public RpcClient() {
        this("ws://localhost:8080/ws");
    }

    public RpcClient(String serverUrl) {
        this.serverUrl = serverUrl;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> sendRequest(String method, Map<String, Object> params) throws Exception {
        var future = new CompletableFuture<Map<String, Object>>();
        var sb = new StringBuilder();

        var client = HttpClient.newHttpClient();
        int id = idCounter.getAndIncrement();

        var ws = client.newWebSocketBuilder()
                .buildAsync(URI.create(serverUrl), new WebSocket.Listener() {
                    @Override
                    public void onOpen(WebSocket webSocket) {
                        webSocket.request(Long.MAX_VALUE);
                    }

                    @Override
                    public CompletionStage<?> onText(WebSocket webSocket, CharSequence data, boolean last) {
                        sb.append(data);
                        if (last) {
                            try {
                                var msg = mapper.readValue(sb.toString(), Map.class);
                                sb.setLength(0);
                                if (msg.containsKey("result") || msg.containsKey("error")) {
                                    if (msg.containsKey("error")) {
                                        future.completeExceptionally(
                                                new RuntimeException("RPC error: " + msg.get("error")));
                                    } else {
                                        future.complete((Map<String, Object>) msg.get("result"));
                                    }
                                }
                            } catch (Exception e) {
                                future.completeExceptionally(e);
                            }
                        }
                        return null;
                    }

                    @Override
                    public CompletionStage<?> onClose(WebSocket webSocket, int statusCode, String reason) {
                        if (!future.isDone()) {
                            future.completeExceptionally(new RuntimeException("WebSocket closed: " + reason));
                        }
                        return null;
                    }

                    @Override
                    public void onError(WebSocket webSocket, Throwable error) {
                        future.completeExceptionally(error);
                    }
                }).join();

        var request = Map.of(
                "jsonrpc", "2.0",
                "id", id,
                "method", method,
                "params", params != null ? params : Map.of()
        );
        ws.sendText(mapper.writeValueAsString(request), true);

        try {
            return future.get(30, TimeUnit.SECONDS);
        } finally {
            ws.sendClose(WebSocket.NORMAL_CLOSURE, "done");
        }
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> sendStreamingRequest(String method, Map<String, Object> params,
                                                     Consumer<Map<String, Object>> onNotification) throws Exception {
        var future = new CompletableFuture<Map<String, Object>>();
        var sb = new StringBuilder();

        var client = HttpClient.newHttpClient();
        int id = idCounter.getAndIncrement();

        var ws = client.newWebSocketBuilder()
                .buildAsync(URI.create(serverUrl), new WebSocket.Listener() {
                    @Override
                    public void onOpen(WebSocket webSocket) {
                        webSocket.request(Long.MAX_VALUE);
                    }

                    @Override
                    public CompletionStage<?> onText(WebSocket webSocket, CharSequence data, boolean last) {
                        sb.append(data);
                        if (last) {
                            try {
                                var msg = mapper.readValue(sb.toString(), Map.class);
                                sb.setLength(0);
                                if (msg.containsKey("method")) {
                                    // Notification (e.g., chat.event)
                                    var notifParams = (Map<String, Object>) msg.get("params");
                                    if (notifParams != null && onNotification != null) {
                                        onNotification.accept(notifParams);
                                    }
                                } else if (msg.containsKey("result") || msg.containsKey("error")) {
                                    if (msg.containsKey("error")) {
                                        future.completeExceptionally(
                                                new RuntimeException("RPC error: " + msg.get("error")));
                                    } else {
                                        future.complete((Map<String, Object>) msg.get("result"));
                                    }
                                }
                            } catch (Exception e) {
                                future.completeExceptionally(e);
                            }
                        }
                        return null;
                    }

                    @Override
                    public CompletionStage<?> onClose(WebSocket webSocket, int statusCode, String reason) {
                        if (!future.isDone()) {
                            future.completeExceptionally(new RuntimeException("WebSocket closed: " + reason));
                        }
                        return null;
                    }

                    @Override
                    public void onError(WebSocket webSocket, Throwable error) {
                        future.completeExceptionally(error);
                    }
                }).join();

        var request = Map.of(
                "jsonrpc", "2.0",
                "id", id,
                "method", method,
                "params", params != null ? params : Map.of()
        );
        ws.sendText(mapper.writeValueAsString(request), true);

        try {
            return future.get(30, TimeUnit.SECONDS);
        } finally {
            ws.sendClose(WebSocket.NORMAL_CLOSURE, "done");
        }
    }
}
