import type { AdminUserListParams } from '../../types/admin-users';

/** Lists never show a full email: first character + domain only. */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@');
  if (at < 1) return '***';
  return `${email.slice(0, 1)}***${email.slice(at)}`;
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function buildUserListQuery(params: AdminUserListParams): string {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.role) query.set('role', params.role);
  if (params.status) query.set('status', params.status);
  query.set('page', String(params.page));
  query.set('pageSize', String(params.pageSize));
  return `?${query.toString()}`;
}