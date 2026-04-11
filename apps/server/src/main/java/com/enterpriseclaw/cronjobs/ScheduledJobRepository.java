package com.enterpriseclaw.cronjobs;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ScheduledJobRepository extends JpaRepository<ScheduledJob, String> {
    List<ScheduledJob> findByStatus(JobStatus status);
}
