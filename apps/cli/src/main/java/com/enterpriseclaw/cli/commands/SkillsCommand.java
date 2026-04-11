package com.enterpriseclaw.cli.commands;

import com.enterpriseclaw.cli.rpc.RpcClient;
import picocli.CommandLine;

import java.util.List;
import java.util.Map;

@CommandLine.Command(name = "skills", description = "Manage available skills",
        subcommands = {
                SkillsCommand.ListCommand.class,
                SkillsCommand.ShowCommand.class,
                SkillsCommand.RescanCommand.class
        })
public class SkillsCommand implements Runnable {

    @CommandLine.Option(names = {"--server"}, description = "Server URL", defaultValue = "ws://localhost:8080/ws")
    String server;

    @Override
    public void run() {
        new ListCommand().server = this.server;
        new CommandLine(new ListCommand()).execute("--server", server);
    }

    @CommandLine.Command(name = "list", description = "List available skills")
    static class ListCommand implements Runnable {

        @CommandLine.Option(names = {"--server"}, description = "Server URL", defaultValue = "ws://localhost:8080/ws")
        String server;

        @Override
        @SuppressWarnings("unchecked")
        public void run() {
            try {
                var client = new RpcClient(server);
                var result = client.sendRequest("skills.list", Map.of());
                var skills = (List<Map<String, Object>>) result.get("skills");

                if (skills == null || skills.isEmpty()) {
                    System.out.println("No skills found.");
                    return;
                }

                System.out.printf("%-30s  %s%n", "NAME", "DESCRIPTION");
                System.out.println("-".repeat(80));
                for (var skill : skills) {
                    System.out.printf("%-30s  %s%n",
                            skill.getOrDefault("name", ""),
                            skill.getOrDefault("description", ""));
                }
            } catch (Exception e) {
                System.err.println("Error: " + e.getMessage());
                System.exit(1);
            }
        }
    }

    @CommandLine.Command(name = "show", description = "Show skill details")
    static class ShowCommand implements Runnable {

        @CommandLine.Option(names = {"--server"}, description = "Server URL", defaultValue = "ws://localhost:8080/ws")
        String server;

        @CommandLine.Parameters(index = "0", description = "Skill name")
        String name;

        @Override
        @SuppressWarnings("unchecked")
        public void run() {
            try {
                var client = new RpcClient(server);
                var result = client.sendRequest("skills.detail", Map.of("name", name));

                System.out.println("Name:        " + result.getOrDefault("name", ""));
                System.out.println("Description: " + result.getOrDefault("description", ""));
                System.out.println("Provider:    " + result.getOrDefault("provider", ""));

                var tools = (List<Map<String, Object>>) result.get("tools");
                if (tools != null && !tools.isEmpty()) {
                    System.out.println("\nTools:");
                    for (var tool : tools) {
                        System.out.printf("  - %s: %s%n",
                                tool.getOrDefault("name", ""),
                                tool.getOrDefault("description", ""));
                    }
                }

                String body = (String) result.get("markdownBody");
                if (body != null && !body.isBlank()) {
                    System.out.println("\n" + body);
                }
            } catch (Exception e) {
                System.err.println("Error: " + e.getMessage());
                System.exit(1);
            }
        }
    }

    @CommandLine.Command(name = "rescan", description = "Rescan skills directory")
    static class RescanCommand implements Runnable {

        @CommandLine.Option(names = {"--server"}, description = "Server URL", defaultValue = "ws://localhost:8080/ws")
        String server;

        @Override
        public void run() {
            try {
                var client = new RpcClient(server);
                var result = client.sendRequest("skills.rescan", Map.of());
                System.out.println("Rescan complete. Skills loaded: " + result.getOrDefault("count", 0));
            } catch (Exception e) {
                System.err.println("Error: " + e.getMessage());
                System.exit(1);
            }
        }
    }
}
