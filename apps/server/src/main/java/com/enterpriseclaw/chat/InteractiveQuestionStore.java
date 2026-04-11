package com.enterpriseclaw.chat;

import com.enterpriseclaw.chat.dto.AnswerRequest;
import org.springaicommunity.agent.tools.AskUserQuestionTool;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Component
public class InteractiveQuestionStore {

    private final ThreadLocal<String> activeSessionId = new ThreadLocal<>();
    private final ConcurrentMap<String, PendingQuestion> pendingQuestions = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, String> submittedAnswers = new ConcurrentHashMap<>();

    public <T> T withSession(String sessionId, Callable<T> action) {
        activeSessionId.set(sessionId);
        try {
            return action.call();
        }
        catch (RuntimeException runtimeException) {
            throw runtimeException;
        }
        catch (Exception exception) {
            throw new IllegalStateException("Question bridge failed", exception);
        }
        finally {
            activeSessionId.remove();
        }
    }

    public PendingUserQuestionException raise(List<AskUserQuestionTool.Question> questions) {
        String sessionId = activeSessionId.get();
        if (sessionId == null || sessionId.isBlank()) {
            throw new IllegalStateException("Interactive questions require an active chat session");
        }

        String questionId = UUID.randomUUID().toString();
        String questionText = formatQuestionText(questions);
        pendingQuestions.put(sessionId, new PendingQuestion(questionId, questionText));
        return new PendingUserQuestionException(questionId, questionText);
    }

    public void submitAnswer(AnswerRequest request) {
        submittedAnswers.put(answerKey(request.sessionId(), request.questionId()), request.answer());
        pendingQuestions.computeIfPresent(request.sessionId(), (sessionId, pending) ->
                pending.questionId().equals(request.questionId()) ? null : pending);
    }

    public String consumeAnswer(String sessionId, String questionId) {
        return submittedAnswers.remove(answerKey(sessionId, questionId));
    }

    private String answerKey(String sessionId, String questionId) {
        return sessionId + ":" + questionId;
    }

    private String formatQuestionText(List<AskUserQuestionTool.Question> questions) {
        if (questions == null || questions.isEmpty()) {
            return "The assistant needs additional input before continuing.";
        }
        if (questions.size() == 1) {
            return questions.get(0).question();
        }
        return questions.stream()
                .map(AskUserQuestionTool.Question::question)
                .reduce((left, right) -> left + "\n\n" + right)
                .orElse("The assistant needs additional input before continuing.");
    }

    private record PendingQuestion(String questionId, String questionText) {
    }
}
