import { useAuthUser } from "./useAuthUser";
import { ROLES, type Role } from "@/domain/auth/roles";

export function useAuthRole() {
  const { user } = useAuthUser();
  const role = user?.role ?? null;

  const hasRole = (...roles: Role[]) => (role ? roles.includes(role) : false);

  return {
    role,
    isAdmin: role === ROLES.ADMIN,
    hasRole,
  };
}
