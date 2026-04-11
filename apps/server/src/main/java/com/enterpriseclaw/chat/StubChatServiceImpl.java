package com.enterpriseclaw.chat;

import com.enterpriseclaw.chat.dto.AnswerRequest;
import com.enterpriseclaw.chat.dto.ChatEvent;
import com.enterpriseclaw.chat.dto.ChatRequest;
import com.enterpriseclaw.chat.dto.MessageSummary;
import com.enterpriseclaw.chat.dto.SessionSummary;
import tools.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.model.tool.ToolCallingChatOptions;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Primary;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyEmitter;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.function.Consumer;

@Service
@Primary
@RequiredArgsConstructor
@Slf4j
public class StubChatServiceImpl implements ChatService {

    private final ChatSessionRepository sessionRepo;
    private final ChatMessageRepository messageRepo;
    private final ObjectMapper objectMapper;
    private final InteractiveQuestionStore questionStore;
    private final EnterpriseChatProperties chatProperties;
    private final SessionCompactionService compactionService;
    @Qualifier("openAiChatClient")
    private final ObjectProvider<ChatClient> openAiChatClient;
    @Qualifier("anthropicChatClient")
    private final ObjectProvider<ChatClient> anthropicChatClient;
    @Qualifier("copilotChatClient")
    private final ObjectProvider<ChatClient> copilotChatClient;
    @Qualifier("codexChatClient")
    private final ObjectProvider<ChatClient> codexChatClient;
    @Qualifier("ollamaChatClient")
    private final ObjectProvider<ChatClient> ollamaChatClient;

    @Override
    public SessionSummary createSession() {
        ChatSession session = ChatSession.builder()
                .id(UUID.randomUUID().toString())
                .userId("solo")
                .status(SessionStatus.ACTIVE)
                .createdAt(Instant.now())
                .lastMessageAt(Instant.now())
                .build();
        sessionRepo.save(session);
        return new SessionSummary(session.getId(), null, session.getLastMessageAt());
    }

    @Override
    public List<SessionSummary> listSessions() {
        return sessionRepo.findAll().stream()
                .map(s -> new SessionSummary(s.getId(), s.getTitle(), s.getLastMessageAt()))
                .toList();
    }

    @Override
    public void deleteSession(String sessionId) {
        sessionRepo.deleteById(sessionId);
    }

    @Override
    public void updateSessionTitle(String sessionId, String title) {
        sessionRepo.findById(sessionId).ifPresent(session -> {
            session.setTitle(title);
            sessionRepo.save(session);
        });
    }

    @Override
    public ResponseBodyEmitter streamChat(ChatRequest request) {
        ResponseBodyEmitter emitter = new ResponseBodyEmitter(30_000L);
        Consumer<ChatEvent> sink = event -> emit(emitter, event);

        Thread.ofVirtual().start(() -> {
            try {
                streamChatToSink(request, sink);
                emitter.complete();
            } catch (Exception e) {
                log.warn("Chat stream failed for session {}", request.sessionId(), e);
                emit(emitter, ChatEvent.error(e.getMessage() == null ? "Chat execution failed" : e.getMessage()));
                emitter.completeWithError(e);
            }
        });

        return emitter;
    }

    @Override
    public void streamChatToSink(ChatRequest request, Consumer<ChatEvent> eventSink) {
        persistMessage(request.sessionId(), MessageRole.USER, request.message());

        try {
            ChatClient chatClient = resolveChatClient(request.model());
            if (chatClient != null) {
                streamWithSpringAi(request, eventSink, chatClient);
            } else {
                streamStub(request, eventSink);
            }
            compactionService.compactIfNeeded(request.sessionId());
        } catch (PendingUserQuestionException e) {
            eventSink.accept(ChatEvent.question(e.getQuestionId(), e.getQuestionText()));
        } catch (Exception e) {
            log.warn("Chat stream failed for session {}", request.sessionId(), e);
            eventSink.accept(ChatEvent.error(e.getMessage() == null ? "Chat execution failed" : e.getMessage()));
        }
    }

    @Override
    public void submitAnswer(AnswerRequest request) {
        questionStore.submitAnswer(request);
        persistMessage(request.sessionId(), MessageRole.USER, request.answer());
        log.debug("Answer received: questionId={}, sessionId={}", request.questionId(), request.sessionId());
    }

    private void streamWithSpringAi(ChatRequest request, Consumer<ChatEvent> sink, ChatClient chatClient) {
        String model = resolveModelName(request.model());
        String assistantText = questionStore.withSession(request.sessionId(), () -> {
            StringBuilder buf = new StringBuilder();
            ChatClient.ChatClientRequestSpec prompt = chatClient.prompt().user(request.message());
            if (StringUtils.hasText(model)) {
                prompt = prompt.options(ToolCallingChatOptions.builder().model(model).build());
            }
            prompt.stream().content().doOnNext(token -> {
                buf.append(token);
                sink.accept(ChatEvent.token(token));
            }).blockLast();
            return buf.toString();
        });

        if (StringUtils.hasText(assistantText)) {
            persistMessage(request.sessionId(), MessageRole.ASSISTANT, assistantText);
        }
        sink.accept(ChatEvent.done());
    }

    private void streamStub(ChatRequest request, Consumer<ChatEvent> sink) throws InterruptedException {
        String response = "Stub response to: " + request.message();
        String[] tokens = response.split(" ");
        for (String token : tokens) {
            sink.accept(ChatEvent.token(token + " "));
            Thread.sleep(80);
        }
        persistMessage(request.sessionId(), MessageRole.ASSISTANT, response);
        sink.accept(ChatEvent.done());
    }

    @Override
    public List<MessageSummary> getSessionMessages(String sessionId, int limit, int offset) {
        List<ChatMessage> all = messageRepo.findBySessionIdOrderByCreatedAtAsc(sessionId);
        return all.stream()
                .skip(offset)
                .limit(limit)
                .map(m -> new MessageSummary(m.getId(), m.getRole(), m.getContent(), m.getCreatedAt()))
                .toList();
    }

    @Override
    @Transactional
    public void clearSessionMessages(String sessionId) {
        messageRepo.deleteBySessionId(sessionId);
    }

    private ChatClient resolveChatClient(String requestedModel) {
        if (requestedModel != null) {
            if (requestedModel.startsWith("copilot:")) return copilotChatClient.getIfAvailable();
            if (requestedModel.startsWith("codex:")) return codexChatClient.getIfAvailable();
            if (requestedModel.startsWith("ollama:")) return ollamaChatClient.getIfAvailable();
            if (requestedModel.startsWith("claude")) return anthropicChatClient.getIfAvailable();
        }
        String provider = chatProperties.getDefaultProvider();
        if ("anthropic".equalsIgnoreCase(provider)) {
            return anthropicChatClient.getIfAvailable();
        }
        return openAiChatClient.getIfAvailable(() -> anthropicChatClient.getIfAvailable());
    }

    private String resolveModelName(String requestedModel) {
        if (StringUtils.hasText(requestedModel)) {
            if (requestedModel.startsWith("copilot:")) return requestedModel.substring("copilot:".length());
            if (requestedModel.startsWith("codex:")) return requestedModel.substring("codex:".length());
            if (requestedModel.startsWith("ollama:")) return requestedModel.substring("ollama:".length());
            return requestedModel;
        }
        return chatProperties.getDefaultModel();
    }

    private void persistMessage(String sessionId, MessageRole role, String content) {
        messageRepo.save(ChatMessage.builder()
                .id(UUID.randomUUID().toString())
                .sessionId(sessionId)
                .role(role)
                .content(content)
                .createdAt(Instant.now())
                .build());
    }

    private void emit(ResponseBodyEmitter emitter, ChatEvent event) {
        try {
            emitter.send(objectMapper.writeValueAsString(event) + "\n");
        } catch (Exception e) {
            log.warn("Emit failed", e);
        }
    }
}
