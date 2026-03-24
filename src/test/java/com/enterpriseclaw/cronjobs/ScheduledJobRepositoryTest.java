package com.enterpriseclaw.cronjobs;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
class ScheduledJobRepositoryTest {

    @Autowired
    private ScheduledJobRepository repository;

    @Test
    void savesAndFindsById() {
        ScheduledJob job = ScheduledJob.builder()
                .id(UUID.randomUUID().toString())
                .userId(UUID.randomUUID().toString())
                .name("Daily Report")
                .prompt("Generate daily summary report")
                .cronExpression("0 0 8 * * *")
                .status(JobStatus.ACTIVE)
                .build();

        ScheduledJob saved = repository.save(job);

        Optional<ScheduledJob> found = repository.findById(saved.getId());
        assertThat(found).isPresent();
        assertThat(found.get().getName()).isEqualTo("Daily Report");
        assertThat(found.get().getStatus()).isEqualTo(JobStatus.ACTIVE);
        assertThat(found.get().getCronExpression()).isEqualTo("0 0 8 * * *");
        assertThat(found.get().getCreatedAt()).isNotNull();
    }

    @Test
    void countReturnsCorrectCount() {
        long before = repository.count();

        repository.save(ScheduledJob.builder()
                .id(UUID.randomUUID().toString())
                .userId(UUID.randomUUID().toString())
                .name("Test Job")
                .prompt("Test prompt")
                .cronExpression("0 * * * * *")
                .status(JobStatus.PAUSED)
                .build());

        assertThat(repository.count()).isEqualTo(before + 1);
    }

    @Test
    void deleteRemovesJob() {
        ScheduledJob job = repository.save(ScheduledJob.builder()
                .id(UUID.randomUUID().toString())
                .userId(UUID.randomUUID().toString())
                .name("Temp Job")
                .prompt("Temp prompt")
                .cronExpression("0 * * * * *")
                .status(JobStatus.ACTIVE)
                .build());

        repository.deleteById(job.getId());

        assertThat(repository.findById(job.getId())).isEmpty();
    }
}
