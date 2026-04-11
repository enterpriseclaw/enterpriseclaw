package com.enterpriseclaw.websocket.rpc;

public record JsonRpcError(int code, String message) {
    public static final int PARSE_ERROR = -32700;
    public static final int METHOD_NOT_FOUND = -32601;
    public static final int INVALID_PARAMS = -32602;
    public static final int INTERNAL_ERROR = -32603;
}
