import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { getAuthService } from "@/domain/auth/auth.service";
import type { User, LoginCredentials, RegisterData, UpdateProfileData, ChangePasswordData } from "@/domain/auth/types";
import { useNotification } from "@/hooks/useNotification";
import { useAuthSession } from "@/hooks/useAuthSession";
import { logger } from "@/lib/logger";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  loginWithGoogle: () => Promise<{ requiresSetup: boolean; isNewUser: boolean }>;
  register: (data: RegisterData) => Promise<void>;
  logout: (opts?: { redirect?: string }) => void;
  updateProfile: (data: UpdateProfileData) => Promise<void>;
  changePassword: (data: ChangePasswordData) => Promise<void>;
  requiresSetup: boolean;
  completeSetup: () => void;
  submitConsent: (payload: { consentType: string; consentText: string; consentVersion: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const { showSuccess, showError, showInfo } = useNotification();
  const { session, setSession, clearSession } = useAuthSession();
  const authService = getAuthService();
  const user = session?.user ?? null;
  const refreshDeadlineMs = 5 * 60 * 1000; // refresh 5 minutes before expiry

  useEffect(() => {
    if (session && session.expiresAt < Date.now()) {
      logger.info("Session expired", { userId: session.user.id });
      clearSession();
    }
    setIsLoading(false);
  }, [session, clearSession]);

  // Auto-refresh token shortly before expiry
  useEffect(() => {
    if (!session?.refreshToken || !session?.expiresAt) return;

    const now = Date.now();
    const msUntilRefresh = Math.max(session.expiresAt - refreshDeadlineMs - now, 0);

    const timer = setTimeout(async () => {
      try {
        const refreshed = await authService.refresh(session.refreshToken);
        setSession({
          ...refreshed,
          requiresSetup: session.requiresSetup,
        });
        logger.info("Session refreshed automatically");
      } catch (error) {
        logger.warn("Auto-refresh failed; clearing session", { error });
        clearSession();
      }
    }, msUntilRefresh);

    return () => clearTimeout(timer);
  }, [session, authService, setSession, clearSession]);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      try {
        const session = await authService.login(credentials);
        setSession({
          ...session,
          requiresSetup: false,
        });
        
        showSuccess("Welcome back!", `Logged in as ${session.user.displayName}`);
        
        logger.info("User logged in", { userId: session.user.id, role: session.user.role });
        return session;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Login failed";
        showError("Login failed", message);
        logger.error("Login error", { email: credentials.email, error: message });
        throw error;
      }
    },
    [authService, showSuccess, showError]
  );

  const loginWithGoogle = useCallback(async () => {
    try {
      logger.info("Starting Google sign-in");
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseToken = await result.user.getIdToken();

      const { isNewUser, requiresSetup, ...session } = await authService.exchangeFirebaseToken(firebaseToken);

      setSession({
        ...session,
        requiresSetup,
      });

      if (isNewUser) {
        showSuccess("Welcome!", "Your account has been created");
      } else {
        showSuccess("Welcome back!", `Logged in as ${session.user.displayName}`);
      }

      logger.info("Google sign-in successful", {
        userId: session.user.id,
        isNewUser,
      });

      return { requiresSetup, isNewUser };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Google sign-in failed";
      showError("Sign-in failed", message);
      logger.error("Google sign-in error", { error: message });
      throw error;
    }
  }, [authService, setSession, showSuccess, showError]);

  const register = useCallback(
    async (data: RegisterData) => {
      try {
        await authService.register(data);
        showSuccess("Account created!", "Please sign in with your credentials");
        logger.info("User registered", { email: data.email });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Registration failed";
        showError("Registration failed", message);
        logger.error("Registration error", { email: data.email, error: message });
        throw error;
      }
    },
    [authService, showSuccess, showError]
  );

  const logout = useCallback(
    (opts?: { redirect?: string }) => {
      const userId = session?.user.id;
      const token = session?.accessToken;
      const redirectTo = opts?.redirect;
      authService.logout(token ?? "").finally(() => {
        clearSession();
        if (redirectTo) {
          window.location.assign(redirectTo);
        }
        showInfo("Logged out", "See you next time!");
        logger.info("User logged out", { userId });
      });
    },
    [session, clearSession, showInfo, authService]
  );

  const updateProfile = useCallback(
    async (data: UpdateProfileData) => {
      if (!session?.accessToken) throw new Error("Not authenticated");

      try {
        const updatedUser = await authService.updateProfile(session.accessToken, data);
        setSession({
          ...session,
          user: updatedUser,
        });
        showSuccess("Profile updated", "Your profile has been updated successfully");
        logger.info("Profile updated", { userId: session.user.id });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Profile update failed";
        showError("Update failed", message);
        logger.error("Profile update error", { userId: session.user.id, error: message });
        throw error;
      }
    },
    [session, authService, showSuccess, showError, setSession]
  );

  const changePassword = useCallback(
    async (data: ChangePasswordData) => {
      if (!session?.accessToken) throw new Error("Not authenticated");

      try {
        await authService.changePassword(data.currentPassword, data.newPassword);
        showSuccess("Password changed", "Your password has been updated successfully");
        logger.info("Password changed", { userId: session.user.id });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Password change failed";
        showError("Change failed", message);
        logger.error("Password change error", { userId: session.user.id, error: message });
        throw error;
      }
    },
    [session, authService, showSuccess, showError]
  );

  const submitConsent = useCallback(
    async (payload: { consentType: string; consentText: string; consentVersion: string }) => {
      if (!session?.accessToken) throw new Error("Not authenticated");
      await authService.recordConsent(session.accessToken, payload);
      logger.info("Consent recorded", { userId: session.user.id, consentType: payload.consentType });
    },
    [authService, session]
  );

  const completeSetup = useCallback(() => {
    if (!session) return;
    setSession({
      ...session,
      requiresSetup: false,
    });
    logger.info("Consent/setup completed", { userId: session.user.id });
  }, [session, setSession]);

  const value: AuthContextValue = {
    user,
    isAuthenticated: Boolean(session?.accessToken),
    isLoading,
    accessToken: session?.accessToken ?? null,
    refreshToken: session?.refreshToken ?? null,
    login: async (credentials: LoginCredentials) => {
      await login(credentials);
    },
    loginWithGoogle,
    register,
    logout,
    updateProfile,
    changePassword,
    requiresSetup: Boolean(session?.requiresSetup),
    completeSetup,
    submitConsent,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
