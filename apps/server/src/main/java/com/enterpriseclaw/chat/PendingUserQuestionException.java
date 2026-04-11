package com.enterpriseclaw.chat;

public class PendingUserQuestionException extends RuntimeException {

    private final String questionId;
    private final String questionText;

    public PendingUserQuestionException(String questionId, String questionText) {
        super(questionText);
        this.questionId = questionId;
        this.questionText = questionText;
    }

    public String getQuestionId() {
        return questionId;
    }

    public String getQuestionText() {
        return questionText;
    }
}
