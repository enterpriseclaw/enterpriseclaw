package com.enterpriseclaw.chat;

import com.enterpriseclaw.chat.dto.AnswerRequest;
import com.enterpriseclaw.chat.dto.ChatRequest;
import com.enterpriseclaw.chat.dto.SessionSummary;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyEmitter;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Slf4j
public class ChatController {

    private final ChatService chatService;

    @PostMapping("/sessions")
    public ResponseEntity<SessionSummary> createSession() {
        return ResponseEntity.ok(chatService.createSession());
    }

    @GetMapping("/sessions")
    public ResponseEntity<List<SessionSummary>> listSessions() {
        return ResponseEntity.ok(chatService.listSessions());
    }

    @DeleteMapping("/sessions/{id}")
    public ResponseEntity<Void> deleteSession(@PathVariable String id) {
        chatService.deleteSession(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/sessions/{id}/title")
    public ResponseEntity<Void> updateTitle(@PathVariable String id,
                                             @RequestBody Map<String, String> body) {
        chatService.updateSessionTitle(id, body.get("title"));
        return ResponseEntity.ok().build();
    }

    @PostMapping(value = "/chat", produces = "application/x-ndjson")
    public ResponseBodyEmitter chat(@Valid @RequestBody ChatRequest request) {
        log.debug("Chat: sessionId={}", request.sessionId());
        return chatService.streamChat(request);
    }

    @PostMapping("/chat/answer")
    public ResponseEntity<Void> submitAnswer(@Valid @RequestBody AnswerRequest request) {
        chatService.submitAnswer(request);
        return ResponseEntity.ok().build();
    }
}
