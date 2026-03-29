import { useAuthSession } from "./useAuthSession";

export function useAuthUser() {
  const { session, setSession, clearSession } = useAuthSession();

  return {
    user: session?.user ?? null,
    accessToken: session?.accessToken ?? null,
    refreshToken: session?.refreshToken ?? null,
    isAuthenticated: Boolean(session?.accessToken),
    setSession,
    clearSession,
  };
}
