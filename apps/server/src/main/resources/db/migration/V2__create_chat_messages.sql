CREATE TABLE chat_messages (
    id          VARCHAR(36)   PRIMARY KEY,
    session_id  VARCHAR(36)   NOT NULL,
    role        VARCHAR(20)   NOT NULL,
    content     TEXT          NOT NULL,
    created_at  TIMESTAMP     NOT NULL
);
CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
