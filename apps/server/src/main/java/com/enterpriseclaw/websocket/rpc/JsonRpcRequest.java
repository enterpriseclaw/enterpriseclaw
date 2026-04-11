package com.enterpriseclaw.websocket.rpc;

import java.util.Map;

public record JsonRpcRequest(
        String jsonrpc,
        String method,
        Map<String, Object> params,
        String id
) {}
