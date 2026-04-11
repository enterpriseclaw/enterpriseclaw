package com.enterpriseclaw.chat;

import com.enterpriseclaw.chat.provider.CodexTokenProvider;
import com.enterpriseclaw.chat.provider.CopilotTokenProvider;
import com.enterpriseclaw.chat.provider.ProviderModels;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.net.HttpURLConnection;
import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@Component
@Slf4j
public class ModelRegistry {

    @Value("${spring.ai.openai.api-key:}")
    private String openAiApiKey;

    @Value("${spring.ai.anthropic.api-key:}")
    private String anthropicApiKey;

    @Value("${spring.ai.ollama.base-url:http://localhost:11434}")
    private String ollamaBaseUrl;

    private final CopilotTokenProvider copilotTokenProvider;
    private final CodexTokenProvider codexTokenProvider;

    private final CopyOnWriteArrayList<AvailableModel> models = new CopyOnWriteArrayList<>();
    private final CopyOnWriteArrayList<ProviderStatus> providerStatuses = new CopyOnWriteArrayList<>();

    public ModelRegistry(CopilotTokenProvider copilotTokenProvider, CodexTokenProvider codexTokenProvider) {
        this.copilotTokenProvider = copilotTokenProvider;
        this.codexTokenProvider = codexTokenProvider;
    }

    public record AvailableModel(String id, String displayName, String provider, boolean available) {}
    public record ProviderStatus(String provider, boolean available, String reason) {}

    @PostConstruct
    public void init() {
        refresh();
    }

    public void refresh() {
        List<AvailableModel> detected = new ArrayList<>();
        List<ProviderStatus> statuses = new ArrayList<>();

        // OpenAI
        boolean openAiAvailable = StringUtils.hasText(openAiApiKey);
        statuses.add(new ProviderStatus("openai", openAiAvailable,
                openAiAvailable ? "API key configured" : "No API key"));
        for (ProviderModels.ModelInfo m : ProviderModels.MODELS.get("openai")) {
            detected.add(new AvailableModel(m.id(), m.displayName(), "openai", openAiAvailable));
        }

        // Anthropic
        boolean anthropicAvailable = StringUtils.hasText(anthropicApiKey);
        statuses.add(new ProviderStatus("anthropic", anthropicAvailable,
                anthropicAvailable ? "API key configured" : "No API key"));
        for (ProviderModels.ModelInfo m : ProviderModels.MODELS.get("anthropic")) {
            detected.add(new AvailableModel(m.id(), m.displayName(), "anthropic", anthropicAvailable));
        }

        // Ollama
        boolean ollamaAvailable = isOllamaRunning();
        statuses.add(new ProviderStatus("ollama", ollamaAvailable,
                ollamaAvailable ? "Ollama reachable at " + ollamaBaseUrl : "Ollama not reachable"));
        for (ProviderModels.ModelInfo m : ProviderModels.MODELS.get("ollama")) {
            detected.add(new AvailableModel(m.id(), m.displayName(), "ollama", ollamaAvailable));
        }

        // Copilot
        boolean copilotAvailable = copilotTokenProvider.isAvailable();
        statuses.add(new ProviderStatus("copilot", copilotAvailable,
                copilotAvailable ? "GitHub token available" : "gh auth token not available"));
        for (ProviderModels.ModelInfo m : ProviderModels.MODELS.get("copilot")) {
            detected.add(new AvailableModel(m.id(), m.displayName(), "copilot", copilotAvailable));
        }

        // Codex
        boolean codexAvailable = codexTokenProvider.isAvailable();
        statuses.add(new ProviderStatus("codex", codexAvailable,
                codexAvailable ? "Codex auth token available" : "Codex auth file not found"));
        for (ProviderModels.ModelInfo m : ProviderModels.MODELS.get("codex")) {
            detected.add(new AvailableModel(m.id(), m.displayName(), "codex", codexAvailable));
        }

        models.clear();
        models.addAll(detected);
        providerStatuses.clear();
        providerStatuses.addAll(statuses);

        log.info("Model registry refreshed: {} models, {} providers ({} available)",
                detected.size(), statuses.size(),
                statuses.stream().filter(ProviderStatus::available).count());
    }

    public List<AvailableModel> getAvailableModels() {
        return models.stream().filter(AvailableModel::available).toList();
    }

    public List<AvailableModel> getAllModels() {
        return List.copyOf(models);
    }

    public List<ProviderStatus> getProviderStatuses() {
        return List.copyOf(providerStatuses);
    }

    private boolean isOllamaRunning() {
        try {
            HttpURLConnection conn = (HttpURLConnection) URI.create(ollamaBaseUrl).toURL().openConnection();
            conn.setConnectTimeout(2000);
            conn.setReadTimeout(2000);
            conn.setRequestMethod("GET");
            int code = conn.getResponseCode();
            conn.disconnect();
            return code == 200;
        } catch (Exception e) {
            log.debug("Ollama not reachable at {}: {}", ollamaBaseUrl, e.getMessage());
            return false;
        }
    }
}
