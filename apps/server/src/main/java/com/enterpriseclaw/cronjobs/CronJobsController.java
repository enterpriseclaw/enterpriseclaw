package com.enterpriseclaw.cronjobs;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/cronjobs")
@RequiredArgsConstructor
public class CronJobsController {

    private final ScheduledJobRepository jobRepository;
    private final JobExecutionRepository executionRepository;
    private final CronExecutionService cronExecutionService;

    public record CronJobSummary(String id, String name, String cronExpression, boolean enabled, Instant lastRunAt) {}

    public record CreateCronJobRequest(
            @NotBlank String name,
            @NotBlank String cronExpression,
            @NotBlank String prompt,
            String model
    ) {}

    public record UpdateCronJobRequest(
            String name,
            String cronExpression,
            String prompt,
            String model
    ) {}

    @GetMapping
    public List<CronJobSummary> listJobs() {
        return jobRepository.findAll().stream()
                .filter(j -> j.getStatus() != JobStatus.DELETED)
                .map(this::toSummary)
                .toList();
    }

    @PostMapping
    public ResponseEntity<ScheduledJob> createJob(@Valid @RequestBody CreateCronJobRequest request) {
        ScheduledJob job = ScheduledJob.builder()
                .id(UUID.randomUUID().toString())
                .userId("solo")
                .name(request.name())
                .cronExpression(request.cronExpression())
                .prompt(request.prompt())
                .status(JobStatus.ACTIVE)
                .createdAt(Instant.now())
                .build();
        jobRepository.save(job);
        cronExecutionService.scheduleJob(job);
        return ResponseEntity.ok(job);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ScheduledJob> getJob(@PathVariable String id) {
        return jobRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<ScheduledJob> updateJob(@PathVariable String id,
                                                   @RequestBody UpdateCronJobRequest request) {
        return jobRepository.findById(id).map(job -> {
            if (request.name() != null) job.setName(request.name());
            if (request.cronExpression() != null) job.setCronExpression(request.cronExpression());
            if (request.prompt() != null) job.setPrompt(request.prompt());
            jobRepository.save(job);
            if (job.getStatus() == JobStatus.ACTIVE) {
                cronExecutionService.scheduleJob(job);
            }
            return ResponseEntity.ok(job);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteJob(@PathVariable String id) {
        return jobRepository.findById(id).map(job -> {
            job.setStatus(JobStatus.DELETED);
            jobRepository.save(job);
            cronExecutionService.unscheduleJob(id);
            return ResponseEntity.noContent().<Void>build();
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/trigger")
    public ResponseEntity<Void> triggerJob(@PathVariable String id) {
        return jobRepository.findById(id).map(job -> {
            cronExecutionService.triggerNow(job);
            return ResponseEntity.accepted().<Void>build();
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/enable")
    public ResponseEntity<ScheduledJob> enableJob(@PathVariable String id) {
        return jobRepository.findById(id).map(job -> {
            cronExecutionService.enableJob(job);
            return ResponseEntity.ok(job);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/disable")
    public ResponseEntity<ScheduledJob> disableJob(@PathVariable String id) {
        return jobRepository.findById(id).map(job -> {
            cronExecutionService.disableJob(job);
            return ResponseEntity.ok(job);
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/history")
    public ResponseEntity<List<JobExecution>> getJobHistory(@PathVariable String id) {
        if (jobRepository.findById(id).isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(executionRepository.findByJobIdOrderByStartedAtDesc(id));
    }

    private CronJobSummary toSummary(ScheduledJob job) {
        return new CronJobSummary(
                job.getId(),
                job.getName(),
                job.getCronExpression(),
                job.getStatus() == JobStatus.ACTIVE,
                job.getLastRunAt()
        );
    }
}
