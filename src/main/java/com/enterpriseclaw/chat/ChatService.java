package com.enterpriseclaw.chat;

import com.enterpriseclaw.chat.dto.AnswerRequest;
import com.enterpriseclaw.chat.dto.ChatRequest;
import com.enterpriseclaw.chat.dto.SessionSummary;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyEmitter;

import java.util.List;

public interface ChatService {
    SessionSummary createSession();

    List<SessionSummary> listSessions();

    void deleteSession(String sessionId);

    void updateSessionTitle(String sessionId, String title);

    ResponseBodyEmitter streamChat(ChatRequest request);

    void submitAnswer(AnswerRequest request);
}
