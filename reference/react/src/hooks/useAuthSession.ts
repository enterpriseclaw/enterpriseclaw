import { useSessionStorage } from "./useSessionStorage";
import { config } from "@/lib/config";
import type { Session } from "@/domain/auth/types";

export function useAuthSession() {
  const [session, setSession] = useSessionStorage<Session | null>(config.sessionKey, null);

  const clearSession = () => setSession(null);

  return {
    session,
    setSession,
    clearSession,
  };
}
