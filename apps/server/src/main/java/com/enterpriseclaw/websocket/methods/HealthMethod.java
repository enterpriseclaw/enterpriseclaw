package com.enterpriseclaw.websocket.methods;

import com.enterpriseclaw.settings.DiagnosticReport;
import com.enterpriseclaw.settings.DiagnosticService;
import com.enterpriseclaw.websocket.rpc.RpcMethod;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import java.util.Map;

@Component
@RequiredArgsConstructor
public class HealthMethod implements RpcMethod {

    private final DiagnosticService diagnosticService;

    @Override
    public String methodName() {
        return "health";
    }

    @Override
    public Object execute(Map<String, Object> params, WebSocketSession session) {
        DiagnosticReport report = diagnosticService.runDiagnostics();
        return Map.of(
                "status", report.overallStatus(),
                "version", "0.0.1-SNAPSHOT",
                "checks", report.checks()
        );
    }
}
