package com.enterpriseclaw.cli.commands;

import com.enterpriseclaw.cli.rpc.RpcClient;
import picocli.CommandLine;

import java.util.Map;

@CommandLine.Command(name = "doctor", description = "Check server health")
public class DoctorCommand implements Runnable {

    @CommandLine.Option(names = {"--server"}, description = "Server URL", defaultValue = "ws://localhost:8080/ws")
    private String server;

    @Override
    public void run() {
        try {
            var client = new RpcClient(server);
            var result = client.sendRequest("health", Map.of());

            System.out.println("Server: " + server);
            System.out.println("Status: " + result.getOrDefault("status", "unknown"));
            System.out.println("Version: " + result.getOrDefault("version", "unknown"));
        } catch (Exception e) {
            System.err.println("Connection failed: " + server);
            System.err.println("Error: " + e.getMessage());
            System.exit(1);
        }
    }
}
