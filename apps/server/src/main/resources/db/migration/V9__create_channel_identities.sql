CREATE TABLE channel_identities (
    id               VARCHAR(36)   PRIMARY KEY,
    tenant_id        VARCHAR(36)   NOT NULL REFERENCES tenants(id),
    app_user_id      VARCHAR(36)   NOT NULL REFERENCES app_users(id),
    channel_type     VARCHAR(20)   NOT NULL,
    channel_user_id  VARCHAR(255)  NOT NULL,
    created_at       TIMESTAMP     NOT NULL
);
CREATE INDEX idx_channel_identities_user ON channel_identities(channel_type, channel_user_id);
