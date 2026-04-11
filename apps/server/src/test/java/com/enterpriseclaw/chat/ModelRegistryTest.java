package com.enterpriseclaw.chat;

import com.enterpriseclaw.chat.ModelRegistry.AvailableModel;
import com.enterpriseclaw.chat.ModelRegistry.ProviderStatus;
import com.enterpriseclaw.chat.provider.CodexTokenProvider;
import com.enterpriseclaw.chat.provider.CopilotTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ModelRegistryTest {

    private CopilotTokenProvider copilotTokenProvider;
    private CodexTokenProvider codexTokenProvider;
    private ModelRegistry registry;

    @BeforeEach
    void setUp() {
        copilotTokenProvider = mock(CopilotTokenProvider.class);
        codexTokenProvider = mock(CodexTokenProvider.class);
        registry = new ModelRegistry(copilotTokenProvider, codexTokenProvider);

        // Set @Value fields via reflection
        ReflectionTestUtils.setField(registry, "openAiApiKey", "sk-test");
        ReflectionTestUtils.setField(registry, "anthropicApiKey", "sk-ant-test");
        ReflectionTestUtils.setField(registry, "ollamaBaseUrl", "http://localhost:11434");
    }

    @Test
    void allProvidersAvailable_returnsAllModels() {
        when(copilotTokenProvider.isAvailable()).thenReturn(true);
        when(codexTokenProvider.isAvailable()).thenReturn(true);
        // Ollama won't be reachable in unit test, so only 4 providers will be "available"

        registry.refresh();

        List<AvailableModel> available = registry.getAvailableModels();
        // OpenAI(4) + Anthropic(3) + Copilot(5) + Codex(4) = 16 (Ollama won't be reachable)
        assertThat(available).hasSizeGreaterThanOrEqualTo(16);
        assertThat(available).allMatch(AvailableModel::available);
    }

    @Test
    void onlyOpenAiAvailable_returnsOnlyOpenAiModels() {
        ReflectionTestUtils.setField(registry, "anthropicApiKey", "");
        when(copilotTokenProvider.isAvailable()).thenReturn(false);
        when(codexTokenProvider.isAvailable()).thenReturn(false);

        registry.refresh();

        List<AvailableModel> available = registry.getAvailableModels();
        assertThat(available).hasSize(4);
        assertThat(available).allMatch(m -> m.provider().equals("openai"));
    }

    @Test
    void getAllModels_returnsAllRegardlessOfAvailability() {
        ReflectionTestUtils.setField(registry, "openAiApiKey", "");
        ReflectionTestUtils.setField(registry, "anthropicApiKey", "");
        when(copilotTokenProvider.isAvailable()).thenReturn(false);
        when(codexTokenProvider.isAvailable()).thenReturn(false);

        registry.refresh();

        List<AvailableModel> all = registry.getAllModels();
        // 4 + 3 + 3 + 5 + 4 = 19 total models
        assertThat(all).hasSizeGreaterThanOrEqualTo(19);
    }

    @Test
    void getProviderStatuses_returnsFiveProviders() {
        when(copilotTokenProvider.isAvailable()).thenReturn(false);
        when(codexTokenProvider.isAvailable()).thenReturn(false);

        registry.refresh();

        List<ProviderStatus> statuses = registry.getProviderStatuses();
        assertThat(statuses).hasSize(5);
        assertThat(statuses).extracting(ProviderStatus::provider)
                .containsExactly("openai", "anthropic", "ollama", "copilot", "codex");
    }

    @Test
    void refresh_reRunsDetection() {
        when(copilotTokenProvider.isAvailable()).thenReturn(false);
        when(codexTokenProvider.isAvailable()).thenReturn(false);

        registry.refresh();
        assertThat(registry.getAvailableModels().stream()
                .anyMatch(m -> m.provider().equals("copilot"))).isFalse();

        // Now copilot becomes available
        when(copilotTokenProvider.isAvailable()).thenReturn(true);
        registry.refresh();

        assertThat(registry.getAvailableModels().stream()
                .anyMatch(m -> m.provider().equals("copilot"))).isTrue();
    }
}
