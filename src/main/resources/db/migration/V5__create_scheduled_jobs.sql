CREATE TABLE scheduled_jobs (
    id               VARCHAR(36)   PRIMARY KEY,
    user_id          VARCHAR(36)   NOT NULL,
    name             VARCHAR(200)  NOT NULL,
    prompt           TEXT          NOT NULL,
    cron_expression  VARCHAR(100)  NOT NULL,
    status           VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',
    last_run_at      TIMESTAMP,
    next_run_at      TIMESTAMP,
    created_at       TIMESTAMP     NOT NULL
);
CREATE INDEX idx_scheduled_jobs_user_id ON scheduled_jobs(user_id);
