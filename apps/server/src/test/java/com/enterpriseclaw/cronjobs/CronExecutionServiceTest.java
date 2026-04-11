package com.enterpriseclaw.cronjobs;

import com.enterpriseclaw.chat.ChatService;
import com.enterpriseclaw.chat.dto.ChatRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.function.Consumer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CronExecutionServiceTest {

    @Mock ScheduledJobRepository jobRepository;
    @Mock JobExecutionRepository executionRepository;
    @Mock ChatService chatService;

    CronExecutionService service;

    @BeforeEach
    void setUp() {
        given(jobRepository.findByStatus(JobStatus.ACTIVE)).willReturn(List.of());
        service = new CronExecutionService(jobRepository, executionRepository, chatService);
        service.init();
    }

    @Test
    void executeJob_savesSuccessfulExecution() {
        ScheduledJob job = ScheduledJob.builder()
                .id("j1").name("Test").prompt("hello").cronExpression("0 0 * * * *")
                .status(JobStatus.ACTIVE).userId("solo").createdAt(Instant.now()).build();

        doAnswer(inv -> {
            Consumer<com.enterpriseclaw.chat.dto.ChatEvent> sink = inv.getArgument(1);
            sink.accept(com.enterpriseclaw.chat.dto.ChatEvent.token("response text"));
            sink.accept(com.enterpriseclaw.chat.dto.ChatEvent.done());
            return null;
        }).when(chatService).streamChatToSink(any(ChatRequest.class), any());

        service.executeJob(job);

        ArgumentCaptor<JobExecution> captor = ArgumentCaptor.forClass(JobExecution.class);
        verify(executionRepository, times(2)).save(captor.capture());

        JobExecution saved = captor.getAllValues().get(1);
        assertThat(saved.getStatus()).isEqualTo(ExecutionStatus.SUCCESS);
        assertThat(saved.getResponse()).isEqualTo("response text");
        assertThat(saved.getCompletedAt()).isNotNull();
    }

    @Test
    void executeJob_savesFailedExecution() {
        ScheduledJob job = ScheduledJob.builder()
                .id("j1").name("Test").prompt("hello").cronExpression("0 0 * * * *")
                .status(JobStatus.ACTIVE).userId("solo").createdAt(Instant.now()).build();

        doThrow(new RuntimeException("chat failure"))
                .when(chatService).streamChatToSink(any(ChatRequest.class), any());

        service.executeJob(job);

        ArgumentCaptor<JobExecution> captor = ArgumentCaptor.forClass(JobExecution.class);
        verify(executionRepository, times(2)).save(captor.capture());

        JobExecution saved = captor.getAllValues().get(1);
        assertThat(saved.getStatus()).isEqualTo(ExecutionStatus.FAILED);
        assertThat(saved.getResponse()).contains("chat failure");
    }

    @Test
    void enableJob_updatesStatusAndSchedules() {
        ScheduledJob job = ScheduledJob.builder()
                .id("j1").name("Test").prompt("hello").cronExpression("0 0 * * * *")
                .status(JobStatus.PAUSED).userId("solo").createdAt(Instant.now()).build();

        service.enableJob(job);

        assertThat(job.getStatus()).isEqualTo(JobStatus.ACTIVE);
        verify(jobRepository).save(job);
    }

    @Test
    void disableJob_updatesStatusAndUnschedules() {
        ScheduledJob job = ScheduledJob.builder()
                .id("j1").name("Test").prompt("hello").cronExpression("0 0 * * * *")
                .status(JobStatus.ACTIVE).userId("solo").createdAt(Instant.now()).build();

        service.disableJob(job);

        assertThat(job.getStatus()).isEqualTo(JobStatus.PAUSED);
        verify(jobRepository).save(job);
    }
}
