/**
 * Role definitions and access control policy
 */

export const ROLES = {
  PARENT: "PARENT",
  ADVOCATE: "ADVOCATE",
  TEACHER_THERAPIST: "TEACHER_THERAPIST",
  ADMIN: "ADMIN",
  SUPPORT: "SUPPORT",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/**
 * Central access policy map
 * Maps roles to allowed routes
 */
export const ACCESS_POLICY: Record<Role, string[]> = {
  [ROLES.PARENT]: [
    "/dashboard",
    "/child-profile",
    "/iep/analyse",
    "/iep/list",
    "/goal-progress",
    "/behavior-abc",
    "/contact-log",
    "/letter-writer",
    "/advocacy-lab",
    "/compliance",
    "/legal-support",
    "/resources",
    "/settings",
  ],
  [ROLES.ADVOCATE]: [
    "/dashboard",
    "/child-profile",
    "/goal-progress",
    "/contact-log",
    "/compliance",
    "/legal-support",
    "/resources",
    "/settings",
  ],
  [ROLES.TEACHER_THERAPIST]: ["/dashboard", "/goal-progress", "/behavior-abc", "/contact-log", "/settings"],
  [ROLES.SUPPORT]: [
    "/dashboard",
    "/child-profile",
    "/iep/analyse",
    "/iep/list",
    "/goal-progress",
    "/behavior-abc",
    "/contact-log",
    "/letter-writer",
    "/advocacy-lab",
    "/compliance",
    "/legal-support",
    "/resources",
    "/settings",
    "/admin/users",
  ],
  [ROLES.ADMIN]: [
    "/dashboard",
    "/child-profile",
    "/iep/analyse",
    "/iep/list",
    "/goal-progress",
    "/behavior-abc",
    "/contact-log",
    "/letter-writer",
    "/advocacy-lab",
    "/compliance",
    "/legal-support",
    "/resources",
    "/settings",
    "/admin/users",
  ],
};

/**
 * Check if a role has access to a specific route
 * Supports nested routes (e.g., /child-profile/123 matches /child-profile)
 */
export function hasAccess(role: Role, path: string): boolean {
  const allowedRoutes = ACCESS_POLICY[role] ?? [];
  
  // Check for exact match first
  if (allowedRoutes.includes(path)) {
    return true;
  }
  
  // Check if the path starts with any allowed route (for nested routes)
  return allowedRoutes.some(route => path.startsWith(route + '/') || path === route);
}

/**
 * Get all routes accessible by a role
 */
export function getAccessibleRoutes(role: Role): string[] {
  return ACCESS_POLICY[role] ?? [];
}
