package com.enterpriseclaw.cli.commands;

import com.enterpriseclaw.cli.rpc.RpcClient;
import picocli.CommandLine;

import java.util.List;
import java.util.Map;

@CommandLine.Command(name = "sessions", description = "Manage sessions")
public class SessionsCommand implements Runnable {

    @CommandLine.Parameters(index = "0", description = "Action: list or delete", defaultValue = "list")
    private String action;

    @CommandLine.Parameters(index = "1", description = "Session ID (for delete)", arity = "0..1")
    private String sessionId;

    @CommandLine.Option(names = {"--server"}, description = "Server URL", defaultValue = "ws://localhost:8080/ws")
    private String server;

    @Override
    @SuppressWarnings("unchecked")
    public void run() {
        try {
            var client = new RpcClient(server);

            switch (action) {
                case "list" -> {
                    var result = client.sendRequest("session.list", Map.of());
                    var sessions = (List<Map<String, Object>>) result.get("sessions");
                    if (sessions == null || sessions.isEmpty()) {
                        System.out.println("No sessions found.");
                        return;
                    }
                    System.out.printf("%-36s  %-20s  %s%n", "SESSION ID", "CREATED", "STATUS");
                    System.out.println("-".repeat(80));
                    for (var session : sessions) {
                        System.out.printf("%-36s  %-20s  %s%n",
                                session.getOrDefault("id", ""),
                                session.getOrDefault("createdAt", ""),
                                session.getOrDefault("status", ""));
                    }
                }
                case "delete" -> {
                    if (sessionId == null) {
                        System.err.println("Error: session ID required for delete");
                        System.exit(1);
                    }
                    client.sendRequest("session.delete", Map.of("sessionId", sessionId));
                    System.out.println("Session " + sessionId + " deleted.");
                }
                default -> {
                    System.err.println("Unknown action: " + action + ". Use 'list' or 'delete'.");
                    System.exit(1);
                }
            }
        } catch (Exception e) {
            System.err.println("Error: " + e.getMessage());
            System.exit(1);
        }
    }
}
