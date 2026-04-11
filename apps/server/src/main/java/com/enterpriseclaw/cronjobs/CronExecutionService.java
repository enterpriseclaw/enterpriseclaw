package com.enterpriseclaw.cronjobs;

import com.enterpriseclaw.chat.ChatService;
import com.enterpriseclaw.chat.dto.ChatEvent;
import com.enterpriseclaw.chat.dto.ChatRequest;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.scheduling.support.CronTrigger;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledFuture;

@Component
@RequiredArgsConstructor
@Slf4j
public class CronExecutionService {

    private final ScheduledJobRepository jobRepository;
    private final JobExecutionRepository executionRepository;
    private final ChatService chatService;

    private final ConcurrentHashMap<String, ScheduledFuture<?>> scheduledFutures = new ConcurrentHashMap<>();
    private ThreadPoolTaskScheduler taskScheduler;

    @PostConstruct
    void init() {
        taskScheduler = new ThreadPoolTaskScheduler();
        taskScheduler.setPoolSize(4);
        taskScheduler.setThreadNamePrefix("cron-exec-");
        taskScheduler.initialize();

        List<ScheduledJob> activeJobs = jobRepository.findByStatus(JobStatus.ACTIVE);

        for (ScheduledJob job : activeJobs) {
            scheduleJob(job);
        }
        log.info("Cron execution service started, scheduled {} active job(s)", activeJobs.size());
    }

    @PreDestroy
    void shutdown() {
        taskScheduler.shutdown();
    }

    public void scheduleJob(ScheduledJob job) {
        unscheduleJob(job.getId());
        CronTrigger trigger = new CronTrigger(job.getCronExpression());
        ScheduledFuture<?> future = taskScheduler.schedule(() -> executeJob(job), trigger);
        scheduledFutures.put(job.getId(), future);
        log.info("Scheduled job '{}' with cron '{}'", job.getName(), job.getCronExpression());
    }

    public void unscheduleJob(String jobId) {
        ScheduledFuture<?> existing = scheduledFutures.remove(jobId);
        if (existing != null) {
            existing.cancel(false);
        }
    }

    public void executeJob(ScheduledJob job) {
        String executionId = UUID.randomUUID().toString();
        JobExecution execution = JobExecution.builder()
                .id(executionId)
                .jobId(job.getId())
                .startedAt(Instant.now())
                .status(ExecutionStatus.RUNNING)
                .build();
        executionRepository.save(execution);

        StringBuilder responseBuffer = new StringBuilder();
        try {
            ChatRequest request = new ChatRequest(
                    "cron-" + job.getId(),
                    job.getPrompt(),
                    null
            );
            chatService.streamChatToSink(request, event -> {
                if ("token".equals(event.type()) && event.text() != null) {
                    responseBuffer.append(event.text());
                }
            });

            execution.setStatus(ExecutionStatus.SUCCESS);
            execution.setResponse(responseBuffer.toString());
            execution.setCompletedAt(Instant.now());

            job.setLastRunAt(Instant.now());
            jobRepository.save(job);
        } catch (Exception e) {
            log.warn("Cron job '{}' failed: {}", job.getName(), e.getMessage());
            execution.setStatus(ExecutionStatus.FAILED);
            execution.setResponse(e.getMessage());
            execution.setCompletedAt(Instant.now());
        }
        executionRepository.save(execution);
    }

    public void enableJob(ScheduledJob job) {
        job.setStatus(JobStatus.ACTIVE);
        jobRepository.save(job);
        scheduleJob(job);
    }

    public void disableJob(ScheduledJob job) {
        job.setStatus(JobStatus.PAUSED);
        jobRepository.save(job);
        unscheduleJob(job.getId());
    }

    public void triggerNow(ScheduledJob job) {
        Thread.ofVirtual().start(() -> executeJob(job));
    }
}
