import { apiRequest } from '@/lib/http';
import type {
  User,
  RegistrationRequest,
  UserStats,
  CreateUserDto,
  UpdateUserDto,
  BulkApproveDto,
  BulkRejectDto,
  BulkImportDto,
  BulkImportResult,
  BulkApproveResult,
  BulkRejectResult,
} from './userManagement.types';

const BASE_URL = '/admin/user-management';

// Get token from sessionStorage (where auth session is stored)
const getToken = () => {
  try {
    const sessionData = sessionStorage.getItem('askiep.session');
    if (!sessionData) return '';
    const session = JSON.parse(sessionData);
    return session?.accessToken || '';
  } catch {
    return '';
  }
};

export const userManagementService = {
  // User CRUD operations
  async getAllUsers(filters?: {
    role?: string;
    status?: string;
    search?: string;
  }): Promise<User[]> {
    const params = new URLSearchParams();
    if (filters?.role) params.append('role', filters.role);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);

    const response = await apiRequest<{ data: User[] }>(
      `/api/v1${BASE_URL}/users?${params.toString()}`,
      { token: getToken() }
    );
    return response.data;
  },

  async getUserById(id: string): Promise<User> {
    const response = await apiRequest<{ data: User }>(
      `/api/v1${BASE_URL}/users/${id}`,
      { token: getToken() }
    );
    return response.data;
  },

  async createUser(data: CreateUserDto): Promise<User> {
    const response = await apiRequest<{ data: User }>(
      `/api/v1${BASE_URL}/users`,
      { method: 'POST', token: getToken(), body: data }
    );
    return response.data;
  },

  async updateUser(id: string, data: UpdateUserDto): Promise<User> {
    const response = await apiRequest<{ data: User }>(
      `/api/v1${BASE_URL}/users/${id}`,
      { method: 'PUT', token: getToken(), body: data }
    );
    return response.data;
  },

  async deleteUser(id: string): Promise<void> {
    await apiRequest(
      `/api/v1${BASE_URL}/users/${id}`,
      { method: 'DELETE', token: getToken() }
    );
  },

  async getUserStats(): Promise<UserStats> {
    const response = await apiRequest<{ data: UserStats }>(
      `/api/v1${BASE_URL}/users/stats`,
      { token: getToken() }
    );
    return response.data;
  },

  async getRoles(): Promise<string[]> {
    const response = await apiRequest<{ data: string[] }>(
      `/api/v1${BASE_URL}/roles`,
      { token: getToken() }
    );
    return response.data;
  },

  // Registration request management
  async getPendingRequests(): Promise<RegistrationRequest[]> {
    const response = await apiRequest<{ data: RegistrationRequest[] }>(
      `/api/v1${BASE_URL}/requests/pending`,
      { token: getToken() }
    );
    return response.data;
  },

  async approveRequests(data: BulkApproveDto): Promise<BulkApproveResult> {
    const response = await apiRequest<{ data: BulkApproveResult }>(
      `/api/v1${BASE_URL}/requests/approve`,
      { method: 'POST', token: getToken(), body: data }
    );
    return response.data;
  },

  async rejectRequests(data: BulkRejectDto): Promise<BulkRejectResult> {
    const response = await apiRequest<{ data: BulkRejectResult }>(
      `/api/v1${BASE_URL}/requests/reject`,
      { method: 'POST', token: getToken(), body: data }
    );
    return response.data;
  },

  // Bulk import
  async downloadCSVTemplate(): Promise<void> {
    const response = await fetch(
      `/api/v1${BASE_URL}/users/import/template`,
      {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      }
    );

    // If the server returned an error (JSON), don't trigger a download of the
    // error payload as CSV — surface the error instead.
    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: 'Failed to download template' }));
      throw new Error(err?.message || 'Failed to download template');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'user_import_template.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  async importUsersFromCSV(data: BulkImportDto): Promise<BulkImportResult> {
    const response = await apiRequest<{ data: BulkImportResult }>(
      `/api/v1${BASE_URL}/users/import/csv`,
      { method: 'POST', token: getToken(), body: data }
    );
    return response.data;
  },

  async deleteUsers(userIds: string[]): Promise<{ deleted: number; failed: Array<{ id: string; reason: string }> }> {
    const response = await apiRequest<{ data: { deleted: number; failed: Array<{ id: string; reason: string }> } }>(
      `/api/v1${BASE_URL}/users/delete`,
      { method: 'POST', token: getToken(), body: { userIds } }
    );
    return response.data;
  },

  async bulkUpdateUsers(userIds: string[], updates: { role?: string; status?: string }): Promise<{ updated: number; failed: Array<{ id: string; reason: string }> }> {
    const response = await apiRequest<{ data: { updated: number; failed: Array<{ id: string; reason: string }> } }>(
      `/api/v1${BASE_URL}/users/bulk-update`,
      { method: 'POST', token: getToken(), body: { userIds, ...updates } }
    );
    return response.data;
  },
};
