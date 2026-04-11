package com.enterpriseclaw.chat.dto;

public record ChatEvent(
        String type,
        String text,
        String tool,
        String questionId,
        String message
) {
    public static ChatEvent token(String text) {
        return new ChatEvent("token", text, null, null, null);
    }

    public static ChatEvent toolCall(String tool) {
        return new ChatEvent("tool_call", null, tool, null, null);
    }

    public static ChatEvent toolDone(String tool) {
        return new ChatEvent("tool_done", null, tool, null, null);
    }

    public static ChatEvent question(String qId, String text) {
        return new ChatEvent("question", text, null, qId, null);
    }

    public static ChatEvent done() {
        return new ChatEvent("done", null, null, null, null);
    }

    public static ChatEvent error(String msg) {
        return new ChatEvent("error", null, null, null, msg);
    }
}
