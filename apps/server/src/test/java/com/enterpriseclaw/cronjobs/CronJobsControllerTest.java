package com.enterpriseclaw.cronjobs;

import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(CronJobsController.class)
class CronJobsControllerTest {

    @Autowired
    MockMvc mockMvc;

    ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    ScheduledJobRepository jobRepository;

    @MockitoBean
    JobExecutionRepository executionRepository;

    @MockitoBean
    CronExecutionService cronExecutionService;

    @Test
    void listJobs_returnsActiveAndPausedJobs() throws Exception {
        given(jobRepository.findAll()).willReturn(List.of(
                ScheduledJob.builder().id("j1").name("Daily Report")
                        .cronExpression("0 0 9 * * *").status(JobStatus.ACTIVE)
                        .userId("solo").prompt("generate report").createdAt(Instant.now()).build(),
                ScheduledJob.builder().id("j2").name("Deleted Job")
                        .cronExpression("0 0 12 * * *").status(JobStatus.DELETED)
                        .userId("solo").prompt("x").createdAt(Instant.now()).build()
        ));

        mockMvc.perform(get("/api/v1/cronjobs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("Daily Report"));
    }

    @Test
    void createJob_returnsCreatedJob() throws Exception {
        given(jobRepository.save(any())).willAnswer(inv -> inv.getArgument(0));

        mockMvc.perform(post("/api/v1/cronjobs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Test Job","cronExpression":"0 0 * * * *","prompt":"do stuff"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Test Job"))
                .andExpect(jsonPath("$.cronExpression").value("0 0 * * * *"));
    }

    @Test
    void getJob_found() throws Exception {
        given(jobRepository.findById("j1")).willReturn(Optional.of(
                ScheduledJob.builder().id("j1").name("Daily").cronExpression("0 0 9 * * *")
                        .status(JobStatus.ACTIVE).userId("solo").prompt("hi").createdAt(Instant.now()).build()
        ));

        mockMvc.perform(get("/api/v1/cronjobs/j1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("j1"));
    }

    @Test
    void getJob_notFound() throws Exception {
        given(jobRepository.findById("missing")).willReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/cronjobs/missing"))
                .andExpect(status().isNotFound());
    }

    @Test
    void deleteJob_returnsNoContent() throws Exception {
        ScheduledJob job = ScheduledJob.builder().id("j1").name("X")
                .cronExpression("0 0 * * * *").status(JobStatus.ACTIVE)
                .userId("solo").prompt("x").createdAt(Instant.now()).build();
        given(jobRepository.findById("j1")).willReturn(Optional.of(job));

        mockMvc.perform(delete("/api/v1/cronjobs/j1"))
                .andExpect(status().isNoContent());

        verify(cronExecutionService).unscheduleJob("j1");
    }

    @Test
    void triggerJob_returnsAccepted() throws Exception {
        ScheduledJob job = ScheduledJob.builder().id("j1").name("X")
                .cronExpression("0 0 * * * *").status(JobStatus.ACTIVE)
                .userId("solo").prompt("x").createdAt(Instant.now()).build();
        given(jobRepository.findById("j1")).willReturn(Optional.of(job));

        mockMvc.perform(post("/api/v1/cronjobs/j1/trigger"))
                .andExpect(status().isAccepted());

        verify(cronExecutionService).triggerNow(any());
    }

    @Test
    void enableJob_callsService() throws Exception {
        ScheduledJob job = ScheduledJob.builder().id("j1").name("X")
                .cronExpression("0 0 * * * *").status(JobStatus.PAUSED)
                .userId("solo").prompt("x").createdAt(Instant.now()).build();
        given(jobRepository.findById("j1")).willReturn(Optional.of(job));

        mockMvc.perform(post("/api/v1/cronjobs/j1/enable"))
                .andExpect(status().isOk());

        verify(cronExecutionService).enableJob(any());
    }

    @Test
    void disableJob_callsService() throws Exception {
        ScheduledJob job = ScheduledJob.builder().id("j1").name("X")
                .cronExpression("0 0 * * * *").status(JobStatus.ACTIVE)
                .userId("solo").prompt("x").createdAt(Instant.now()).build();
        given(jobRepository.findById("j1")).willReturn(Optional.of(job));

        mockMvc.perform(post("/api/v1/cronjobs/j1/disable"))
                .andExpect(status().isOk());

        verify(cronExecutionService).disableJob(any());
    }

    @Test
    void getJobHistory_returnsExecutions() throws Exception {
        given(jobRepository.findById("j1")).willReturn(Optional.of(
                ScheduledJob.builder().id("j1").name("X").cronExpression("0 0 * * * *")
                        .status(JobStatus.ACTIVE).userId("solo").prompt("x").createdAt(Instant.now()).build()
        ));
        given(executionRepository.findByJobIdOrderByStartedAtDesc("j1")).willReturn(List.of(
                JobExecution.builder().id("e1").jobId("j1").startedAt(Instant.now())
                        .status(ExecutionStatus.SUCCESS).build()
        ));

        mockMvc.perform(get("/api/v1/cronjobs/j1/history"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value("e1"));
    }

    @Test
    void getJobHistory_notFound() throws Exception {
        given(jobRepository.findById("missing")).willReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/cronjobs/missing/history"))
                .andExpect(status().isNotFound());
    }

    @Test
    void createJob_validationFails() throws Exception {
        mockMvc.perform(post("/api/v1/cronjobs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"","cronExpression":"","prompt":""}
                                """))
                .andExpect(status().isBadRequest());
    }
}
