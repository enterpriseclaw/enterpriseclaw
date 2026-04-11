package com.enterpriseclaw.chat;

import com.enterpriseclaw.chat.dto.ChatEvent;
import com.enterpriseclaw.chat.dto.ChatRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.ObjectProvider;
import tools.jackson.databind.ObjectMapper;

import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Consumer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class ProviderRoutingTest {

    private StubChatServiceImpl chatService;
    private ChatClient openAiClient;
    private ChatClient anthropicClient;
    private ChatClient copilotClient;
    private ChatClient codexClient;
    private ChatClient ollamaClient;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        ChatSessionRepository sessionRepo = mock(ChatSessionRepository.class);
        ChatMessageRepository messageRepo = mock(ChatMessageRepository.class);
        ObjectMapper objectMapper = new ObjectMapper();
        InteractiveQuestionStore questionStore = new InteractiveQuestionStore();
        EnterpriseChatProperties chatProperties = new EnterpriseChatProperties();

        openAiClient = mock(ChatClient.class);
        anthropicClient = mock(ChatClient.class);
        copilotClient = mock(ChatClient.class);
        codexClient = mock(ChatClient.class);
        ollamaClient = mock(ChatClient.class);

        ObjectProvider<ChatClient> openAiProvider = mock(ObjectProvider.class);
        ObjectProvider<ChatClient> anthropicProvider = mock(ObjectProvider.class);
        ObjectProvider<ChatClient> copilotProvider = mock(ObjectProvider.class);
        ObjectProvider<ChatClient> codexProvider = mock(ObjectProvider.class);
        ObjectProvider<ChatClient> ollamaProvider = mock(ObjectProvider.class);

        when(openAiProvider.getIfAvailable()).thenReturn(openAiClient);
        when(openAiProvider.getIfAvailable(any())).thenReturn(openAiClient);
        when(anthropicProvider.getIfAvailable()).thenReturn(anthropicClient);
        when(copilotProvider.getIfAvailable()).thenReturn(copilotClient);
        when(codexProvider.getIfAvailable()).thenReturn(codexClient);
        when(ollamaProvider.getIfAvailable()).thenReturn(ollamaClient);

        SessionCompactionService compactionService = mock(SessionCompactionService.class);

        chatService = new StubChatServiceImpl(
                sessionRepo, messageRepo, objectMapper, questionStore, chatProperties,
                compactionService,
                openAiProvider, anthropicProvider, copilotProvider, codexProvider, ollamaProvider
        );
    }

    @Test
    void copilotPrefix_routesToCopilotClient() {
        // Make the copilot client throw a specific exception so we can verify routing
        setupClientToThrow(copilotClient, "COPILOT_CALLED");

        AtomicReference<String> errorMsg = new AtomicReference<>();
        Consumer<ChatEvent> sink = event -> {
            if ("error".equals(event.type())) {
                errorMsg.set(event.message());
            }
        };

        chatService.streamChatToSink(new ChatRequest("s1", "hello", "copilot:gpt-4.1"), sink);

        assertThat(errorMsg.get()).contains("COPILOT_CALLED");
    }

    @Test
    void codexPrefix_routesToCodexClient() {
        setupClientToThrow(codexClient, "CODEX_CALLED");

        AtomicReference<String> errorMsg = new AtomicReference<>();
        Consumer<ChatEvent> sink = event -> {
            if ("error".equals(event.type())) {
                errorMsg.set(event.message());
            }
        };

        chatService.streamChatToSink(new ChatRequest("s1", "hello", "codex:gpt-5.4"), sink);

        assertThat(errorMsg.get()).contains("CODEX_CALLED");
    }

    @Test
    void ollamaPrefix_routesToOllamaClient() {
        setupClientToThrow(ollamaClient, "OLLAMA_CALLED");

        AtomicReference<String> errorMsg = new AtomicReference<>();
        Consumer<ChatEvent> sink = event -> {
            if ("error".equals(event.type())) {
                errorMsg.set(event.message());
            }
        };

        chatService.streamChatToSink(new ChatRequest("s1", "hello", "ollama:llama3.2"), sink);

        assertThat(errorMsg.get()).contains("OLLAMA_CALLED");
    }

    @Test
    void claudePrefix_routesToAnthropicClient() {
        setupClientToThrow(anthropicClient, "ANTHROPIC_CALLED");

        AtomicReference<String> errorMsg = new AtomicReference<>();
        Consumer<ChatEvent> sink = event -> {
            if ("error".equals(event.type())) {
                errorMsg.set(event.message());
            }
        };

        chatService.streamChatToSink(new ChatRequest("s1", "hello", "claude-sonnet-4-5-20250929"), sink);

        assertThat(errorMsg.get()).contains("ANTHROPIC_CALLED");
    }

    @Test
    void plainGptModel_routesToOpenAiClient() {
        setupClientToThrow(openAiClient, "OPENAI_CALLED");

        AtomicReference<String> errorMsg = new AtomicReference<>();
        Consumer<ChatEvent> sink = event -> {
            if ("error".equals(event.type())) {
                errorMsg.set(event.message());
            }
        };

        chatService.streamChatToSink(new ChatRequest("s1", "hello", "gpt-4.1"), sink);

        assertThat(errorMsg.get()).contains("OPENAI_CALLED");
    }

    private void setupClientToThrow(ChatClient client, String marker) {
        ChatClient.ChatClientRequestSpec requestSpec = mock(ChatClient.ChatClientRequestSpec.class);
        when(client.prompt()).thenReturn(requestSpec);
        when(requestSpec.user(anyString())).thenReturn(requestSpec);
        when(requestSpec.options(any())).thenReturn(requestSpec);
        when(requestSpec.stream()).thenThrow(new RuntimeException(marker));
    }
}
