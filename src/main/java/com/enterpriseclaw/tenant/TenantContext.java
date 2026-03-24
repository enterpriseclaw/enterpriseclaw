package com.enterpriseclaw.tenant;

import org.springframework.stereotype.Component;

/**
 * Thread-local holder for current tenant context.
 * In solo mode, defaults to "default" tenant.
 */
@Component
public class TenantContext {
    private static final ThreadLocal<String> CURRENT = ThreadLocal.withInitial(() -> "default");

    public static String current() { return CURRENT.get(); }
    public static void set(String tenantId) { CURRENT.set(tenantId); }
    public static void clear() { CURRENT.remove(); }
}
