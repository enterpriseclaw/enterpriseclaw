package com.enterpriseclaw.chat.provider;

import java.util.List;
import java.util.Map;

public final class ProviderModels {

    private ProviderModels() {
    }

    public record ModelInfo(String id, String displayName) {
    }

    public static final Map<String, List<ModelInfo>> MODELS = Map.of(
            "openai", List.of(
                    new ModelInfo("gpt-4.1", "GPT-4.1"),
                    new ModelInfo("gpt-4o", "GPT-4o"),
                    new ModelInfo("gpt-4o-mini", "GPT-4o Mini"),
                    new ModelInfo("o3-mini", "o3-mini")
            ),
            "anthropic", List.of(
                    new ModelInfo("claude-sonnet-4-5-20250929", "Claude Sonnet 4.5"),
                    new ModelInfo("claude-opus-4-20250514", "Claude Opus 4"),
                    new ModelInfo("claude-haiku-3-5-20241022", "Claude Haiku 3.5")
            ),
            "ollama", List.of(
                    new ModelInfo("ollama:llama3.2", "Llama 3.2"),
                    new ModelInfo("ollama:qwen2.5", "Qwen 2.5"),
                    new ModelInfo("ollama:mistral", "Mistral")
            ),
            "copilot", List.of(
                    new ModelInfo("copilot:gpt-4.1", "Copilot GPT-4.1"),
                    new ModelInfo("copilot:gpt-5-mini", "Copilot GPT-5 Mini"),
                    new ModelInfo("copilot:claude-sonnet-4", "Copilot Claude Sonnet 4"),
                    new ModelInfo("copilot:claude-opus-4.5", "Copilot Claude Opus 4.5"),
                    new ModelInfo("copilot:gemini-2.5-pro", "Copilot Gemini 2.5 Pro")
            ),
            "codex", List.of(
                    new ModelInfo("codex:gpt-5.4", "Codex GPT-5.4"),
                    new ModelInfo("codex:gpt-5.4-mini", "Codex GPT-5.4 Mini"),
                    new ModelInfo("codex:gpt-5.3-codex", "Codex GPT-5.3"),
                    new ModelInfo("codex:gpt-5.2-codex", "Codex GPT-5.2")
            )
    );
}
