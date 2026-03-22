CREATE TABLE skills_registry (
    id            VARCHAR(36)   PRIMARY KEY,
    tenant_id     VARCHAR(36)   NOT NULL REFERENCES tenants(id),
    name          VARCHAR(200)  NOT NULL,
    description   TEXT,
    provider      VARCHAR(100),
    enabled       BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP     NOT NULL
);
CREATE INDEX idx_skills_registry_tenant ON skills_registry(tenant_id);
