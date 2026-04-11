package com.enterpriseclaw.cronjobs;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "job_executions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobExecution {
    @Id
    private String id;

    @Column(nullable = false)
    private String jobId;

    @Column(nullable = false)
    private Instant startedAt;

    private Instant completedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ExecutionStatus status;

    private Integer tokensUsed;
    private String skillActivated;

    @Column(columnDefinition = "TEXT")
    private String response;
}
