package com.enterpriseclaw.skills;

import java.util.List;
import java.util.Map;

public record LoadedSkill(
    String name,
    String description,
    String markdownBody,
    List<ToolDefinition> tools
) {
    public record ToolDefinition(String name, String description, Map<String, Object> parameters) {}
}
