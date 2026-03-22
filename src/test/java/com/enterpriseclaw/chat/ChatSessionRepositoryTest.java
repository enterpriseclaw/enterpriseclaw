package com.enterpriseclaw.chat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
class ChatSessionRepositoryTest {

    @Autowired
    private ChatSessionRepository repository;

    @Test
    void savesAndFindsById() {
        ChatSession session = ChatSession.builder()
                .id(UUID.randomUUID().toString())
                .userId(UUID.randomUUID().toString())
                .title("Test Session")
                .status(SessionStatus.ACTIVE)
                .build();

        ChatSession saved = repository.save(session);

        Optional<ChatSession> found = repository.findById(saved.getId());
        assertThat(found).isPresent();
        assertThat(found.get().getTitle()).isEqualTo("Test Session");
        assertThat(found.get().getStatus()).isEqualTo(SessionStatus.ACTIVE);
        assertThat(found.get().getCreatedAt()).isNotNull();
        assertThat(found.get().getLastMessageAt()).isNotNull();
    }

    @Test
    void countReturnsCorrectCount() {
        long before = repository.count();

        repository.save(ChatSession.builder()
                .id(UUID.randomUUID().toString())
                .userId(UUID.randomUUID().toString())
                .status(SessionStatus.ACTIVE)
                .build());

        assertThat(repository.count()).isEqualTo(before + 1);
    }

    @Test
    void deleteRemovesSession() {
        ChatSession session = repository.save(ChatSession.builder()
                .id(UUID.randomUUID().toString())
                .userId(UUID.randomUUID().toString())
                .status(SessionStatus.ARCHIVED)
                .build());

        repository.deleteById(session.getId());

        assertThat(repository.findById(session.getId())).isEmpty();
    }
}
