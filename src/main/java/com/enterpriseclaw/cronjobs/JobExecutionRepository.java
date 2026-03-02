package com.enterpriseclaw.cronjobs;

import org.springframework.data.jpa.repository.JpaRepository;

public interface JobExecutionRepository extends JpaRepository<JobExecution, String> {
}
