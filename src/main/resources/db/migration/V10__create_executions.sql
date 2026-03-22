CREATE TABLE executions (
    id               VARCHAR(36)   PRIMARY KEY,
    tenant_id        VARCHAR(36)   NOT NULL,
    user_id          VARCHAR(36)   NOT NULL,
    channel          VARCHAR(20)   NOT NULL,
    session_id       VARCHAR(36),
    request_message  TEXT          NOT NULL,
    response_text    TEXT,
    success          BOOLEAN       NOT NULL DEFAULT TRUE,
    error_message    TEXT,
    tools_invoked    TEXT,
    skills_activated TEXT,
    latency_ms       BIGINT,
    created_at       TIMESTAMP     NOT NULL
);
CREATE INDEX idx_executions_tenant ON executions(tenant_id);
CREATE INDEX idx_executions_user ON executions(user_id);
CREATE INDEX idx_executions_created ON executions(created_at DESC);
