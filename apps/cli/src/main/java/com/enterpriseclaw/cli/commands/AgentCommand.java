package com.enterpriseclaw.cli.commands;

import com.enterpriseclaw.cli.rpc.RpcClient;
import picocli.CommandLine;

import java.util.HashMap;
import java.util.Map;

@CommandLine.Command(name = "agent", description = "Send a message to the agent")
public class AgentCommand implements Runnable {

    @CommandLine.Parameters(index = "0", description = "The message to send")
    private String message;

    @CommandLine.Option(names = {"--model", "-m"}, description = "Model to use")
    private String model;

    @CommandLine.Option(names = {"--session", "-s"}, description = "Session ID to use")
    private String sessionId;

    @CommandLine.Option(names = {"--server"}, description = "Server URL", defaultValue = "ws://localhost:8080/ws")
    private String server;

    @Override
    public void run() {
        try {
            var client = new RpcClient(server);

            if (sessionId == null) {
                var sessionResult = client.sendRequest("session.create", Map.of());
                sessionId = (String) sessionResult.get("sessionId");
            }

            var params = new HashMap<String, Object>();
            params.put("sessionId", sessionId);
            params.put("message", message);
            if (model != null) {
                params.put("model", model);
            }

            client.sendStreamingRequest("chat.send", params, notification -> {
                var token = notification.get("token");
                if (token != null) {
                    System.out.print(token);
                    System.out.flush();
                }
            });

            System.out.println();
        } catch (Exception e) {
            System.err.println("Error: " + e.getMessage());
            System.exit(1);
        }
    }
}
