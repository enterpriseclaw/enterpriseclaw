CREATE TABLE tenants (
    id          VARCHAR(36)   PRIMARY KEY,
    slug        VARCHAR(100)  NOT NULL UNIQUE,
    name        VARCHAR(200)  NOT NULL,
    status      VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',
    created_at  TIMESTAMP     NOT NULL
);
CREATE INDEX idx_tenants_slug ON tenants(slug);
