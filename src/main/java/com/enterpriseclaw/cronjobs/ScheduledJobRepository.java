package com.enterpriseclaw.cronjobs;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ScheduledJobRepository extends JpaRepository<ScheduledJob, String> {
}
