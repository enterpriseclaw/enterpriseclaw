package com.enterpriseclaw.audit;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "agent_run_log")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgentRunLog {
    @Id
    private String id;

    @Column(nullable = false)
    private String sessionId;

    @Column(nullable = false)
    private String userId;

    private Integer promptTokens;
    private Integer completionTokens;
    private Long durationMs;
    private String skillActivated;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
