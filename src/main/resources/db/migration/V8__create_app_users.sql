CREATE TABLE app_users (
    id            VARCHAR(36)   PRIMARY KEY,
    tenant_id     VARCHAR(36)   NOT NULL REFERENCES tenants(id),
    email         VARCHAR(255)  NOT NULL,
    display_name  VARCHAR(200),
    status        VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',
    created_at    TIMESTAMP     NOT NULL
);
CREATE INDEX idx_app_users_tenant ON app_users(tenant_id);
CREATE UNIQUE INDEX idx_app_users_email ON app_users(tenant_id, email);
