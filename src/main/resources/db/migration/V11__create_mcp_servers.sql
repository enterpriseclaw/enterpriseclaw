CREATE TABLE mcp_servers (
    id             VARCHAR(36)   PRIMARY KEY,
    tenant_id      VARCHAR(36)   NOT NULL REFERENCES tenants(id),
    name           VARCHAR(100)  NOT NULL,
    url            VARCHAR(500)  NOT NULL,
    transport      VARCHAR(20)   NOT NULL DEFAULT 'HTTP',
    status         VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',
    description    TEXT,
    created_at     TIMESTAMP     NOT NULL
);
CREATE INDEX idx_mcp_servers_tenant ON mcp_servers(tenant_id);
