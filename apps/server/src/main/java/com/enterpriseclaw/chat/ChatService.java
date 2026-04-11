package com.enterpriseclaw.chat;

import com.enterpriseclaw.chat.dto.AnswerRequest;
import com.enterpriseclaw.chat.dto.ChatEvent;
import com.enterpriseclaw.chat.dto.ChatRequest;
import com.enterpriseclaw.chat.dto.MessageSummary;
import com.enterpriseclaw.chat.dto.SessionSummary;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyEmitter;

import java.util.List;
import java.util.function.Consumer;

public interface ChatService {
    SessionSummary createSession();

    List<SessionSummary> listSessions();

    void deleteSession(String sessionId);

    void updateSessionTitle(String sessionId, String title);

    ResponseBodyEmitter streamChat(ChatRequest request);

    void streamChatToSink(ChatRequest request, Consumer<ChatEvent> eventSink);

    void submitAnswer(AnswerRequest request);

    List<MessageSummary> getSessionMessages(String sessionId, int limit, int offset);

    void clearSessionMessages(String sessionId);
}
