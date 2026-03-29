import { config } from "@/lib/config";
import { logger } from "@/lib/logger";
import { apiRequest, ApiError } from "@/lib/http";
import type {
  LoginCredentials,
  RegisterData,
  Session,
  User,
  UpdateProfileData,
  ChangePasswordData,
  AuthResponse,
  GoogleAuthResponse,
  ConsentPayload,
} from "./types";

const DEFAULT_EXPIRY_FALLBACK_MS = config.sessionDuration;

function base64Decode(value: string): string {
  if (typeof atob === "function") {
    return atob(value);
  }
  // Fallback for environments without atob (shouldn't happen in browsers)
  const binary = value.replace(/[^A-Za-z0-9+/=]/g, '');
  throw new Error("Base64 decoding not available in this environment");
}

function decodeJwtExpiry(token: string): number | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(base64Decode(normalized));
    if (decoded.exp) {
      return decoded.exp * 1000;
    }
    return null;
  } catch (error) {
    logger.warn("Unable to decode JWT expiry", { error });
    return null;
  }
}

function toSession(response: AuthResponse, requiresSetup = false): Session {
  const expiresAt = decodeJwtExpiry(response.token) ?? Date.now() + DEFAULT_EXPIRY_FALLBACK_MS;

  return {
    accessToken: response.token,
    refreshToken: response.refreshToken,
    user: response.user,
    expiresAt,
    requiresSetup,
  };
}

export interface AuthService {
  login(credentials: LoginCredentials): Promise<Session>;
  exchangeFirebaseToken(firebaseToken: string): Promise<Session & { isNewUser: boolean; requiresSetup: boolean }>;
  register(data: RegisterData): Promise<void>;
  refresh(refreshToken: string): Promise<Session>;
  getProfile(accessToken: string): Promise<User>;
  updateProfile(accessToken: string, data: UpdateProfileData): Promise<User>;
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
  logout(accessToken: string): Promise<void>;
  recordConsent(accessToken: string, payload: ConsentPayload): Promise<void>;
}

class AuthServiceImpl implements AuthService {
  async login(credentials: LoginCredentials): Promise<Session> {
    if (!credentials.email || !credentials.password) {
      throw new Error("Email and password are required");
    }

    try {
      logger.info("Login attempt", { email: credentials.email });
      const response = await apiRequest<AuthResponse>(config.api.endpoints.auth.login, {
        method: "POST",
        body: credentials,
      });

      const session = toSession(response);
      logger.info("Login successful", { userId: session.user.id, role: session.user.role });
      return session;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        throw new Error("Invalid email or password");
      }
      throw error;
    }
  }

  async exchangeFirebaseToken(firebaseToken: string): Promise<Session & { isNewUser: boolean; requiresSetup: boolean }> {
    if (!firebaseToken) {
      throw new Error("Missing Firebase token");
    }

    try {
      logger.info("Exchanging Firebase token for session");
      const response = await apiRequest<GoogleAuthResponse>(config.api.endpoints.auth.exchangeToken, {
        method: "POST",
        body: { firebaseToken },
      });

      const session = toSession(response, response.requiresSetup);

      return {
        ...session,
        isNewUser: response.isNewUser,
        requiresSetup: response.requiresSetup,
      };
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        throw new Error("This email is registered with password. Please sign in with email and password.");
      }

      if (error instanceof ApiError && error.status === 401) {
        throw new Error("Google sign-in failed. Please try again.");
      }

      throw error;
    }
  }

  async register(data: RegisterData): Promise<void> {
    if (!data.email || !data.password || !data.displayName || !data.role) {
      throw new Error("All fields are required");
    }

    try {
      logger.info("Registration attempt", { email: data.email });
      const path = data.endpointOverride || config.api.endpoints.auth.register;
      await apiRequest<void>(path, {
        method: "POST",
        body: data,
      });
      logger.info("Registration successful", { email: data.email, role: data.role });
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        throw new Error("User with this email already exists");
      }
      throw error;
    }
  }

  async refresh(refreshToken: string): Promise<Session> {
    if (!refreshToken) {
      throw new Error("Missing refresh token");
    }

    try {
      const response = await apiRequest<AuthResponse>(config.api.endpoints.auth.refresh, {
        method: "POST",
        body: { refreshToken },
      });
      const session = toSession(response);
      logger.info("Token refreshed", { userId: session.user.id });
      return session;
    } catch (error) {
      logger.error("Token refresh failed", { error });
      throw error;
    }
  }

  async getProfile(accessToken: string): Promise<User> {
    if (!accessToken) throw new Error("Missing access token");
    return apiRequest<User>(config.api.endpoints.auth.profile, {
      method: "GET",
      token: accessToken,
    });
  }

  async updateProfile(accessToken: string, data: UpdateProfileData): Promise<User> {
    if (!accessToken) throw new Error("Missing access token");
    logger.info("Profile update attempt");
    return apiRequest<User>(config.api.endpoints.auth.profile, {
      method: "PUT",
      token: accessToken,
      body: data,
    });
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const token = sessionStorage.getItem('accessToken');
    if (!token) throw new Error('Not authenticated');
    
    logger.info('Password change attempt');
    await apiRequest<void>(config.api.endpoints.auth.changePassword, {
      method: 'POST',
      token,
      body: { currentPassword, newPassword },
    });
    logger.info('Password changed successfully');
  }

  async logout(accessToken: string): Promise<void> {
    if (!accessToken) return;
    try {
      await apiRequest<void>(config.api.endpoints.auth.logout, {
        method: "POST",
        token: accessToken,
      });
      logger.info("User logged out via API");
    } catch (error) {
      // Don't block logout on API failure
      logger.warn("Logout request failed", { error });
    }
  }

  async recordConsent(accessToken: string, payload: ConsentPayload): Promise<void> {
    if (!accessToken) throw new Error("Missing access token");

    await apiRequest<void>(config.api.endpoints.consents, {
      method: "POST",
      token: accessToken,
      body: payload,
    });
  }
}

const authServiceInstance = new AuthServiceImpl();

export function getAuthService(): AuthService {
  return authServiceInstance;
}
