CREATE TABLE audit_events (
    id          VARCHAR(36)   PRIMARY KEY,
    user_id     VARCHAR(36)   NOT NULL,
    event_type  VARCHAR(100)  NOT NULL,
    details     TEXT,
    session_id  VARCHAR(36),
    created_at  TIMESTAMP     NOT NULL
);
CREATE INDEX idx_audit_events_user_id ON audit_events(user_id);
