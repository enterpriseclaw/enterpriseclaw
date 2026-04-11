package com.enterpriseclaw.chat;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class SessionCompactionService {

    private static final int MAX_MESSAGES = 200;
    private static final int KEEP_RECENT = 50;

    private final ChatMessageRepository messageRepo;

    @Async
    @Transactional
    public void compactIfNeeded(String sessionId) {
        long count = messageRepo.countBySessionId(sessionId);
        if (count <= MAX_MESSAGES) {
            return;
        }

        List<ChatMessage> all = messageRepo.findBySessionIdOrderByCreatedAtAsc(sessionId);
        int toDelete = all.size() - KEEP_RECENT;
        if (toDelete <= 0) {
            return;
        }

        List<String> idsToDelete = all.subList(0, toDelete).stream()
                .map(ChatMessage::getId)
                .toList();
        messageRepo.deleteAllById(idsToDelete);
        log.info("Compacted session {}: deleted {} old messages, kept {}", sessionId, toDelete, KEEP_RECENT);
    }
}
