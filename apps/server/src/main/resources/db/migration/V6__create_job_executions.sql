CREATE TABLE job_executions (
    id               VARCHAR(36)  PRIMARY KEY,
    job_id           VARCHAR(36)  NOT NULL,
    started_at       TIMESTAMP    NOT NULL,
    completed_at     TIMESTAMP,
    status           VARCHAR(20)  NOT NULL DEFAULT 'RUNNING',
    tokens_used      INTEGER,
    skill_activated  VARCHAR(100),
    response         TEXT
);
CREATE INDEX idx_job_executions_job_id ON job_executions(job_id);
