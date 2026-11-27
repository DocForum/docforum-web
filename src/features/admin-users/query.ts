// URL/filter helpers for admin user management (issue #70) — pure so the URL
// contract and the last-admin rule are testable without a DOM.
import { ApiError } from '../../services/api-client';
import type {
  AdminUserQuery,
  AdminUserRoleFilter,
  AdminUserStatusFilter,
} from '../../types/models';

export const ADMIN_USERS_PAGE_SIZE = 10;

const ROLES: AdminUserRoleFilter[] = ['all', 'patient', 'doctor', 'facility', 'admin'];
const STATUSES: AdminUserStatusFilter[] = ['all', 'active', 'deactivated'];

/** Invalid values are dropped (the screen shows a notice), never sent on. */
export function parseAdminUserQuery(search: URLSearchParams): {
  query: AdminUserQuery;
  droppedInvalid: boolean;
} {
  const searchText = search.get('q') ?? '';
  const rawRole = search.get('role');
  const rawStatus = search.get('status');
  const rawPage = search.get('page');

  const role = ROLES.includes(rawRole as AdminUserRoleFilter) ? (rawRole as AdminUserRoleFilter) : 'all';
  const status = STATUSES.includes(rawStatus as AdminUserStatusFilter)
    ? (rawStatus as AdminUserStatusFilter)
    : 'all';
  const pageNumber = Number(rawPage);
  const page = rawPage && Number.isInteger(pageNumber) && pageNumber > 0 ? pageNumber : 1;

  return {
    query: { search: searchText, role, status, page, pageSize: ADMIN_USERS_PAGE_SIZE },
    droppedInvalid:
      (rawRole !== null && role === 'all' && rawRole !== 'all') ||
      (rawStatus !== null && status === 'all' && rawStatus !== 'all') ||
      (rawPage !== null && (page !== pageNumber || !Number.isInteger(pageNumber))),
  };
}

export function toAdminUserSearch(query: AdminUserQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.search.trim()) params.set('q', query.search.trim());
  if (query.role !== 'all') params.set('role', query.role);
  if (query.status !== 'all') params.set('status', query.status);
  if (query.page > 1) params.set('page', String(query.page));
  return params;
}

/** 10–500 characters, whitespace collapsed; returns the reason or an error. */
export function validateDeactivationReason(raw: string): { reason: string } | { error: string } {
  const reason = raw.replace(/\s+/g, ' ').trim();
  if (reason.length < 10) {
    return { error: 'Write at least 10 characters explaining why this account is being deactivated.' };
  }
  if (reason.length > 500) {
    return { error: 'Keep the reason to 500 characters or fewer.' };
  }
  return { reason };
}

/**
 * The last-active-admin guard. docforum-core#39 names the rule but not a code,
 * so accept a `LAST_ADMIN` code and fall back to the 409 + message it is
 * expected to send today.
 */
export function isLastAdminError(error: unknown): boolean {
  if (!(error instanceof ApiError) || error.status !== 409) return false;
  if (error.code === 'LAST_ADMIN') return true;
  return /last\s+active\s+admin|last\s+admin/i.test(error.message);
}

export function isDeactivated(user: { status: string }): boolean {
  return user.status === 'deactivated';
}
