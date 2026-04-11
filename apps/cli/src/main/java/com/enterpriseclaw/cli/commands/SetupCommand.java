package com.enterpriseclaw.cli.commands;

import com.enterpriseclaw.cli.rpc.RpcClient;
import picocli.CommandLine;

import java.util.List;
import java.util.Map;

@CommandLine.Command(name = "setup", description = "First-run onboarding and diagnostics")
public class SetupCommand implements Runnable {

    @CommandLine.Option(names = {"--server"}, description = "Server URL", defaultValue = "ws://localhost:8080/ws")
    private String server;

    @Override
    @SuppressWarnings("unchecked")
    public void run() {
        System.out.println("EnterpriseClaw Setup");
        System.out.println("====================");
        System.out.println();

        // Step 1: Check server connectivity
        RpcClient client;
        Map<String, Object> healthResult;
        try {
            client = new RpcClient(server);
            healthResult = client.sendRequest("health", Map.of());
        } catch (Exception e) {
            System.err.println("Server not running at " + server);
            System.err.println("Start with: task local:dev:server");
            System.exit(1);
            return;
        }

        System.out.println("Server: " + server);
        System.out.println("Status: " + healthResult.getOrDefault("status", "unknown"));
        System.out.println("Version: " + healthResult.getOrDefault("version", "unknown"));
        System.out.println();

        // Step 2: List available models
        try {
            var modelsResult = client.sendRequest("models.list", Map.of());
            Object modelsObj = modelsResult.get("models");
            if (modelsObj instanceof List<?> models) {
                System.out.println("Available Models:");
                System.out.printf("  %-30s %-15s %s%n", "MODEL", "PROVIDER", "STATUS");
                System.out.printf("  %-30s %-15s %s%n", "-----", "--------", "------");
                for (Object m : models) {
                    if (m instanceof Map<?, ?> model) {
                        String available = Boolean.TRUE.equals(model.get("available")) ? "ready" : "unavailable";
                        System.out.printf("  %-30s %-15s %s%n",
                                model.get("displayName"),
                                model.get("provider"),
                                available);
                    }
                }
                System.out.println();
            }
        } catch (Exception e) {
            System.err.println("Could not fetch models: " + e.getMessage());
        }

        // Step 3: Print diagnostic checks
        Object checksObj = healthResult.get("checks");
        if (checksObj instanceof List<?> checks) {
            System.out.println("Diagnostics:");
            for (Object c : checks) {
                if (c instanceof Map<?, ?> check) {
                    String icon = switch (String.valueOf(check.get("status"))) {
                        case "ok" -> "[OK]  ";
                        case "warn" -> "[WARN]";
                        case "fail" -> "[FAIL]";
                        default -> "[????]";
                    };
                    System.out.printf("  %s %s — %s%n", icon, check.get("name"), check.get("message"));
                }
            }
            System.out.println();
        }

        // Step 4: Guidance
        boolean hasProvider = false;
        if (checksObj instanceof List<?> checks) {
            for (Object c : checks) {
                if (c instanceof Map<?, ?> check && "ok".equals(check.get("status"))) {
                    String name = String.valueOf(check.get("name"));
                    if (!"database".equals(name) && !"skills".equals(name)) {
                        hasProvider = true;
                        break;
                    }
                }
            }
        }

        if (!hasProvider) {
            System.out.println("No AI providers available.");
            System.out.println("Add API keys to .env.sample -> .env");
        } else {
            System.out.println("Ready! Try: ec agent 'hello world'");
        }
    }
}
