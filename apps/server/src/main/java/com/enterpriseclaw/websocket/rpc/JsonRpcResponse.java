package com.enterpriseclaw.websocket.rpc;

public record JsonRpcResponse(
        String jsonrpc,
        String id,
        Object result,
        JsonRpcError error
) {
    public static JsonRpcResponse success(String id, Object result) {
        return new JsonRpcResponse("2.0", id, result, null);
    }

    public static JsonRpcResponse error(String id, int code, String message) {
        return new JsonRpcResponse("2.0", id, null, new JsonRpcError(code, message));
    }
}
