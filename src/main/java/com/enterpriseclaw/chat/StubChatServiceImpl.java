package com.enterpriseclaw.chat;

import com.enterpriseclaw.chat.dto.AnswerRequest;
import com.enterpriseclaw.chat.dto.ChatEvent;
import com.enterpriseclaw.chat.dto.ChatRequest;
import com.enterpriseclaw.chat.dto.SessionSummary;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyEmitter;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@Primary
@RequiredArgsConstructor
@Slf4j
public class StubChatServiceImpl implements ChatService {

    private final ChatSessionRepository sessionRepo;
    private final ChatMessageRepository messageRepo;
    private final ObjectMapper objectMapper;

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
        messageRepo.save(ChatMessage.builder()
                .id(UUID.randomUUID().toString())
                .sessionId(request.sessionId())
                .role(MessageRole.USER)
                .content(request.message())
                .createdAt(Instant.now())
                .build());

        ResponseBodyEmitter emitter = new ResponseBodyEmitter(30_000L);

        Thread.ofVirtual().start(() -> {
            try {
                String[] tokens = ("Stub response to: " + request.message()).split(" ");
                for (String token : tokens) {
                    emit(emitter, ChatEvent.token(token + " "));
                    Thread.sleep(80);
                }
                // persist assistant message
                messageRepo.save(ChatMessage.builder()
                        .id(UUID.randomUUID().toString())
                        .sessionId(request.sessionId())
                        .role(MessageRole.ASSISTANT)
                        .content("Stub response to: " + request.message())
                        .createdAt(Instant.now())
                        .build());
                emit(emitter, ChatEvent.done());
                emitter.complete();
            } catch (Exception e) {
                emit(emitter, ChatEvent.error(e.getMessage()));
                emitter.completeWithError(e);
            }
        });

        return emitter;
    }

    @Override
    public void submitAnswer(AnswerRequest request) {
        log.debug("Answer received: questionId={}, sessionId={}", request.questionId(), request.sessionId());
    }

    private void emit(ResponseBodyEmitter emitter, ChatEvent event) {
        try {
            emitter.send(objectMapper.writeValueAsString(event) + "\n");
        } catch (Exception e) {
            log.warn("Emit failed", e);
        }
    }
}
