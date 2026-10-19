import { apiRequest } from './api-client';
import { buildUserListQuery } from '../features/admin-users/utils';
import type {
  AdminInvite,
  AdminUserDetail,
  AdminUserListParams,
  AdminUserListResponse,
} from '../types/admin-users';

type Method = 'GET' | 'POST' | 'DELETE';

// ADAPTER: the only place that depends on api-client's shape (Step 1, row 1).
// If api-client exports something different, change just this function.
function request<T>(path: string, method: Method = 'GET', body?: unknown): Promise<T> {
  return apiRequest<T>(path, { method, body });
}

const enc = encodeURIComponent;

export const adminUsersService = {
  listUsers(params: AdminUserListParams) {
    return request<AdminUserListResponse>(`/admin/users${buildUserListQuery(params)}`);
  },
  getUser(id: string) {
    return request<AdminUserDetail>(`/admin/users/${enc(id)}`);
  },
  deactivateUser(id: string, reason: string) {
    return request<void>(`/admin/users/${enc(id)}/deactivate`, 'POST', { reason });
  },
  reactivateUser(id: string, reason: string) {
    return request<void>(`/admin/users/${enc(id)}/reactivate`, 'POST', { reason });
  },
  listInvites() {
    return request<AdminInvite[]>('/admin/invites');
  },
  sendInvite(email: string) {
    return request<AdminInvite>('/admin/invites', 'POST', { email });
  },
  revokeInvite(id: string) {
    return request<void>(`/admin/invites/${enc(id)}`, 'DELETE');
  },
};