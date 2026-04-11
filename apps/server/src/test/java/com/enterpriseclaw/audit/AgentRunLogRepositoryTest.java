package com.enterpriseclaw.audit;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
class AgentRunLogRepositoryTest {

    @Autowired
    private AgentRunLogRepository repository;

    @Test
    void savesAndFindsById() {
        AgentRunLog log = AgentRunLog.builder()
                .id(UUID.randomUUID().toString())
                .sessionId(UUID.randomUUID().toString())
                .userId(UUID.randomUUID().toString())
                .promptTokens(100)
                .completionTokens(200)
                .durationMs(1500L)
                .skillActivated("default")
                .build();

        AgentRunLog saved = repository.save(log);

        Optional<AgentRunLog> found = repository.findById(saved.getId());
        assertThat(found).isPresent();
        assertThat(found.get().getPromptTokens()).isEqualTo(100);
        assertThat(found.get().getCompletionTokens()).isEqualTo(200);
        assertThat(found.get().getDurationMs()).isEqualTo(1500L);
        assertThat(found.get().getCreatedAt()).isNotNull();
    }

    @Test
    void countReturnsCorrectCount() {
        long before = repository.count();

        repository.save(AgentRunLog.builder()
                .id(UUID.randomUUID().toString())
                .sessionId(UUID.randomUUID().toString())
                .userId(UUID.randomUUID().toString())
                .build());

        assertThat(repository.count()).isEqualTo(before + 1);
    }

    @Test
    void deleteRemovesLog() {
        AgentRunLog log = repository.save(AgentRunLog.builder()
                .id(UUID.randomUUID().toString())
                .sessionId(UUID.randomUUID().toString())
                .userId(UUID.randomUUID().toString())
                .build());

        repository.deleteById(log.getId());

        assertThat(repository.findById(log.getId())).isEmpty();
    }
}
