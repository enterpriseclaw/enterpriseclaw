CREATE TABLE agent_run_log (
    id                 VARCHAR(36)  PRIMARY KEY,
    session_id         VARCHAR(36)  NOT NULL,
    user_id            VARCHAR(36)  NOT NULL,
    prompt_tokens      INTEGER,
    completion_tokens  INTEGER,
    duration_ms        BIGINT,
    skill_activated    VARCHAR(100),
    created_at         TIMESTAMP    NOT NULL
);
CREATE INDEX idx_agent_run_log_user_id ON agent_run_log(user_id);
CREATE INDEX idx_agent_run_log_session_id ON agent_run_log(session_id);
