CREATE TABLE chat_sessions (
    id               VARCHAR(36)  PRIMARY KEY,
    user_id          VARCHAR(36)  NOT NULL,
    title            VARCHAR(60),
    status           VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    created_at       TIMESTAMP    NOT NULL,
    last_message_at  TIMESTAMP    NOT NULL
);
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
