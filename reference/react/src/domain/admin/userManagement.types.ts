// Admin user management types

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegistrationRequest {
  id: string;
  email: string;
  displayName: string;
  role: string;
  reason?: string;
  status: string;
  createdAt: string;
}

export interface UserStats {
  total: number;
  byRole: Record<string, number>;
  byStatus: Record<string, number>;
  pendingRequests: number;
}

export interface CreateUserDto {
  email: string;
  password: string;
  displayName: string;
  role: string;
  status?: 'active' | 'pending' | 'inactive';
}

export interface UpdateUserDto {
  displayName?: string;
  email?: string;
  role?: string;
  status?: 'active' | 'pending' | 'inactive' | 'suspended';
}

export interface BulkApproveDto {
  requestIds: string[];
}

export interface BulkRejectDto {
  requestIds: string[];
  reason?: string;
}

export interface BulkImportDto {
  users: Array<{
    email: string;
    displayName: string;
    role: string;
  }>;
}

export interface BulkImportResult {
  imported: number;
  failed: Array<{
    row: number;
    email: string;
    reason: string;
  }>;
}

export interface BulkApproveResult {
  approved: number;
  failed: Array<{
    requestId: string;
    reason: string;
  }>;
}

export interface BulkRejectResult {
  rejected: number;
  failed: Array<{
    requestId: string;
    reason: string;
  }>;
}
