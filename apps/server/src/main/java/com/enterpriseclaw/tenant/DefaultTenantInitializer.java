package com.enterpriseclaw.tenant;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/**
 * Ensures the "default" tenant exists on startup (solo mode).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DefaultTenantInitializer implements ApplicationRunner {

    private static final String DEFAULT_TENANT_ID = "default";
    private static final String DEFAULT_TENANT_SLUG = "default";

    private final TenantRepository tenantRepository;

    @Override
    public void run(ApplicationArguments args) {
        tenantRepository.findBySlug(DEFAULT_TENANT_SLUG).ifPresentOrElse(
                t -> log.debug("Default tenant already exists: {}", t.getId()),
                () -> {
                    Tenant t = Tenant.builder()
                            .id(DEFAULT_TENANT_ID)
                            .slug(DEFAULT_TENANT_SLUG)
                            .name("Default")
                            .status(TenantStatus.ACTIVE)
                            .build();
                    tenantRepository.save(t);
                    log.info("Created default tenant");
                }
        );
    }
}
