// Admin user management (issue #70). ASSUMED contract against
// docforum-core#39 ("Admin account lifecycle"), which has not landed — see
// ARCHITECTURE_ESSENTIALS.md "Known assumptions — Phase W6".
import { apiFetch } from './api-client';
import type {
  AdminInvite,
  AdminUser,
  AdminUserPage,
  AdminUserQuery,
  DeactivateAdminUserInput,
  SendAdminInviteInput,
} from '../types/models';

export function listAdminUsers(
  query: AdminUserQuery,
  accessToken: string,
  signal?: AbortSignal,
): Promise<AdminUserPage> {
  const params = new URLSearchParams();
  if (query.search.trim()) params.set('search', query.search.trim());
  if (query.role !== 'all') params.set('role', query.role);
  if (query.status !== 'all') params.set('status', query.status);
  params.set('page', String(query.page));
  params.set('pageSize', String(query.pageSize));

  return apiFetch<AdminUserPage>(`/admin/users?${params.toString()}`, { accessToken, signal });
}

export function getAdminUser(
  userId: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<AdminUser> {
  return apiFetch<AdminUser>(`/admin/users/${userId}`, { accessToken, signal });
}

/** 409 + `LAST_ADMIN` when this is the last active admin (assumed code — the
 * error envelope only carries `{message}` on the live API today). */
export function deactivateAdminUser(
  userId: string,
  input: DeactivateAdminUserInput,
  accessToken: string,
): Promise<AdminUser> {
  return apiFetch<AdminUser>(`/admin/users/${userId}/deactivate`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}

export function reactivateAdminUser(userId: string, accessToken: string): Promise<AdminUser> {
  return apiFetch<AdminUser>(`/admin/users/${userId}/reactivate`, {
    method: 'POST',
    accessToken,
  });
}

export function listAdminInvites(accessToken: string, signal?: AbortSignal): Promise<AdminInvite[]> {
  return apiFetch<AdminInvite[]>('/admin/invites', { accessToken, signal });
}

export function sendAdminInvite(input: SendAdminInviteInput, accessToken: string): Promise<AdminInvite> {
  return apiFetch<AdminInvite>('/admin/invites', { method: 'POST', body: input, accessToken });
}

export function revokeAdminInvite(inviteId: string, accessToken: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/admin/invites/${inviteId}`, {
    method: 'DELETE',
    accessToken,
  });
}
