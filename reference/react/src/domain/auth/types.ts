import type { Role } from "./roles";

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  status?: string;
  provider?: string;
  isApproved?: boolean;
  isActive?: boolean;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  user: User;
  expiresAt: number;
  requiresSetup?: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface GoogleAuthResponse extends AuthResponse {
  isNewUser: boolean;
  requiresSetup: boolean;
}

export interface ConsentPayload {
  consentType: string;
  consentText: string;
  consentVersion: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  displayName: string;
  role: Role;
  endpointOverride?: string;
}

export interface UpdateProfileData {
  displayName?: string;
  email?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}
