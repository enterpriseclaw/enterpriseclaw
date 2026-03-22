package com.enterpriseclaw.tenant;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Servlet filter that sets the current tenant context for each HTTP request
 * and clears it when the request completes.
 *
 * <p>The tenant is resolved from the {@code X-Tenant-ID} request header.
 * If the header is absent, the "default" tenant is used (solo mode).
 *
 * <p>Always clears the ThreadLocal in {@code finally} to prevent memory leaks
 * in thread-pool environments.
 */
@Component
@Slf4j
public class TenantContextFilter extends OncePerRequestFilter {

    private static final String TENANT_HEADER = "X-Tenant-ID";

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        String tenantId = request.getHeader(TENANT_HEADER);
        if (tenantId == null || tenantId.isBlank()) {
            tenantId = "default";
        }

        TenantContext.set(tenantId);
        log.trace("TenantContext set to '{}' for request {}", tenantId, request.getRequestURI());

        try {
            filterChain.doFilter(request, response);
        } finally {
            TenantContext.clear();
            log.trace("TenantContext cleared after request {}", request.getRequestURI());
        }
    }
}
