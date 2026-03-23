package com.enterpriseclaw.integration;

import com.enterpriseclaw.audit.AuditEvent;
import com.enterpriseclaw.audit.AuditEventRepository;
import com.enterpriseclaw.gateway.EnterpriseGatewayService;
import com.enterpriseclaw.identity.IdentityResolver;
import com.enterpriseclaw.model.*;
import com.enterpriseclaw.policy.PolicyEngine;
import com.enterpriseclaw.tenant.Tenant;
import com.enterpriseclaw.tenant.TenantRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration test for the enterprise gateway pipeline using a real
 * PostgreSQL + pgvector database via Testcontainers.
 *
 * <p>The container is wired to Spring Boot via {@code @ServiceConnection}, which
 * creates a {@code JdbcConnectionDetails} bean used by both the DataSource and
 * Flyway — guaranteeing all three (datasource / Flyway / Hibernate) point at the
 * same PostgreSQL instance.
 *
 * <p>Tests:
 * <ul>
 *   <li>Full gateway execution (identity → policy → audit)</li>
 *   <li>Tenant seeding on startup</li>
 *   <li>Audit events persisted to real PostgreSQL</li>
 *   <li>Identity resolution across ChannelTypes</li>
 *   <li>Policy engine tool/skill visibility</li>
 * </ul>
 *
 * <p>Run: {@code ./gradlew integrationTest}
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@Testcontainers(disabledWithoutDocker = true)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class GatewayIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres =
            new PostgreSQLContainer<>(DockerImageName.parse("pgvector/pgvector:pg16")
                    .asCompatibleSubstituteFor("postgres"))
                    .withDatabaseName("enterpriseclaw")
                    .withUsername("enterpriseclaw")
                    .withPassword("enterpriseclaw");

    /** PostgreSQL dialect is needed because it cannot be inferred from JdbcConnectionDetails alone. */
    @DynamicPropertySource
    static void configureJpa(DynamicPropertyRegistry registry) {
        registry.add("spring.jpa.properties.hibernate.dialect",
                () -> "org.hibernate.dialect.PostgreSQLDialect");
    }

    @Autowired
    EnterpriseGatewayService gateway;

    @Autowired
    IdentityResolver identityResolver;

    @Autowired
    PolicyEngine policyEngine;

    @Autowired
    AuditEventRepository auditEventRepository;

    @Autowired
    TenantRepository tenantRepository;

    // ------------------------------------------------------------------ tenancy

    @Test
    @Order(1)
    void defaultTenantIsSeededOnStartup() {
        assertThat(tenantRepository.findBySlug("default")).isPresent();
    }

    @Test
    @Order(2)
    void canPersistAndRetrieveTenant() {
        Tenant t = Tenant.builder()
                .id(UUID.randomUUID().toString())
                .slug("acme-corp")
                .name("Acme Corp")
                .build();
        tenantRepository.save(t);
        assertThat(tenantRepository.findBySlug("acme-corp")).isPresent();
    }

    // ------------------------------------------------------------------ identity

    @Test
    @Order(3)
    void resolvesSoloUserIdentity() {
        IncomingChannelRequest req = IncomingChannelRequest.fromWeb(
                UUID.randomUUID().toString(), "solo", "hello", "default");
        ResolvedUserIdentity identity = identityResolver.resolve(req);

        assertThat(identity.userId()).isEqualTo("solo");
        assertThat(identity.roles()).contains("admin");
        assertThat(identity.tenantId()).isEqualTo("default");
    }

    @Test
    @Order(4)
    void resolvesUnknownUserWithDefaultRole() {
        IncomingChannelRequest req = IncomingChannelRequest.fromWeb(
                UUID.randomUUID().toString(), "unknown-user-xyz", "hello", "default");
        ResolvedUserIdentity identity = identityResolver.resolve(req);

        assertThat(identity.userId()).isEqualTo("unknown-user-xyz");
        assertThat(identity.roles()).contains("user");
    }

    @Test
    @Order(5)
    void resolvesCLIChannel() {
        IncomingChannelRequest req = new IncomingChannelRequest(
                UUID.randomUUID().toString(), ChannelType.CLI,
                "admin", null, "list tools", "default",
                java.time.Instant.now(), java.util.Map.of());
        ResolvedUserIdentity identity = identityResolver.resolve(req);

        assertThat(identity.roles()).contains("admin");
    }

    // ------------------------------------------------------------------ policy

    @Test
    @Order(6)
    void adminCanSeeAllReadTools() {
        IncomingChannelRequest req = IncomingChannelRequest.fromWeb(
                UUID.randomUUID().toString(), "admin", "query", "default");
        ResolvedUserIdentity identity = identityResolver.resolve(req);
        Set<String> tools = policyEngine.getVisibleTools(identity, "WEB");

        assertThat(tools).containsAnyOf("file.read", "db.read", "knowledge.search");
    }

    @Test
    @Order(7)
    void policyAllowsKnowledgeSearchForUser() {
        var identity = new ResolvedUserIdentity("u1", "u1@test.com", "User", "default",
                Set.of("user"));
        var decision = policyEngine.evaluateTool(identity, "knowledge.search", "WEB");
        assertThat(decision.allowed()).isTrue();
        assertThat(decision.approvalRequired()).isFalse();
    }

    @Test
    @Order(8)
    void policyDeniesWriteToolForBasicUser() {
        var identity = new ResolvedUserIdentity("u2", "u2@test.com", "User", "default",
                Set.of("user"));
        var decision = policyEngine.evaluateTool(identity, "service.restart", "WEB");
        assertThat(decision.allowed()).isFalse();
    }

    @Test
    @Order(9)
    void policyRequiresApprovalForAdminWriteTool() {
        var identity = new ResolvedUserIdentity("a1", "a1@test.com", "Admin", "default",
                Set.of("admin", "user"));
        var decision = policyEngine.evaluateTool(identity, "service.restart", "WEB");
        assertThat(decision.allowed()).isTrue();
        assertThat(decision.approvalRequired()).isTrue();
    }

    // ------------------------------------------------------------------ gateway pipeline

    @Test
    @Order(10)
    void gatewayExecutesPipelineAndPersistsAudit() {
        long auditCountBefore = auditEventRepository.count();

        IncomingChannelRequest req = IncomingChannelRequest.fromWeb(
                UUID.randomUUID().toString(), "solo", "What is our incident response SLA?", "default");
        ExecutionResult result = gateway.execute(req);

        assertThat(result.success()).isTrue();
        assertThat(result.response()).isNotBlank();
        assertThat(result.latencyMs()).isGreaterThanOrEqualTo(0);

        // Verify audit event was written to PostgreSQL
        assertThat(auditEventRepository.count()).isEqualTo(auditCountBefore + 1);
    }

    @Test
    @Order(11)
    void gatewayHandlesMultipleChannels() {
        String requestId1 = UUID.randomUUID().toString();
        String requestId2 = UUID.randomUUID().toString();

        ExecutionResult web = gateway.execute(
                IncomingChannelRequest.fromWeb(requestId1, "solo", "Web request", "default"));
        ExecutionResult cli = gateway.execute(
                new IncomingChannelRequest(requestId2, ChannelType.CLI, "admin", null,
                        "CLI request", "default", java.time.Instant.now(), java.util.Map.of()));

        assertThat(web.success()).isTrue();
        assertThat(cli.success()).isTrue();
    }

    @Test
    @Order(12)
    void auditEventsAreQueryableFromPostgres() {
        // Execute several requests
        for (int i = 0; i < 3; i++) {
            gateway.execute(IncomingChannelRequest.fromWeb(
                    UUID.randomUUID().toString(), "solo", "Audit test " + i, "default"));
        }

        List<AuditEvent> events = auditEventRepository.findAll();
        assertThat(events).isNotEmpty();

        // Every event must have required fields
        for (AuditEvent event : events) {
            assertThat(event.getId()).isNotBlank();
            assertThat(event.getUserId()).isNotBlank();
            assertThat(event.getEventType()).isNotBlank();
            assertThat(event.getCreatedAt()).isNotNull();
        }
    }
}
