package com.enterpriseclaw.cronjobs;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface JobExecutionRepository extends JpaRepository<JobExecution, String> {
    List<JobExecution> findByJobIdOrderByStartedAtDesc(String jobId);
}
