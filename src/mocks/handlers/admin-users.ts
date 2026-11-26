// Admin user management (issue #70): searchable user list, deactivate /
// reactivate, and admin invites. The last-active-admin guard is enforced here
// so the UI's error state is exercised by the mock too.
import { http, HttpResponse } from 'msw';
import { db } from '../db';
import { badRequest, conflict, notFound, paramId, respond } from '../helpers';
import type { AdminUser, AdminUserPage, AdminUserRoleFilter, AdminUserStatusFilter } from '../../types/models';

function countActiveAdmins(): number {
  return db.adminUsers.filter((user) => user.role === 'admin' && user.status === 'active').length;
}

export const adminUserHandlers = [
  http.get(
    '*/admin/users',
    respond('json', ({ request }) => {
      const url = new URL(request.url);
      const search = (url.searchParams.get('search') ?? '').trim().toLowerCase();
      const role = (url.searchParams.get('role') ?? 'all') as AdminUserRoleFilter;
      const status = (url.searchParams.get('status') ?? 'all') as AdminUserStatusFilter;
      const page = Math.max(1, Number(url.searchParams.get('page') ?? '1') || 1);
      const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') ?? '10') || 10));

      const filtered = db.adminUsers
        .filter((user) => role === 'all' || user.role === role)
        .filter((user) => status === 'all' || user.status === status)
        .filter(
          (user) =>
            !search ||
            user.email.toLowerCase().includes(search) ||
            user.fullName.toLowerCase().includes(search),
        )
        .sort((a, b) => a.email.localeCompare(b.email));

      const start = (page - 1) * pageSize;
      const body: AdminUserPage = {
        items: filtered.slice(start, start + pageSize),
        total: filtered.length,
        page,
        pageSize,
      };
      return body;
    }),
  ),

  http.get(
    '*/admin/users/:userId',
    respond('json', ({ params }) => {
      const user = db.adminUsers.find((row) => row.id === paramId(params, 'userId'));
      return user ?? notFound('user');
    }),
  ),

  http.post(
    '*/admin/users/:userId/deactivate',
    respond('json', async ({ params, request }) => {
      const userId = paramId(params, 'userId');
      const user = db.adminUsers.find((row) => row.id === userId);
      if (!user) return notFound('user');
      const body = (await request.json().catch(() => ({}))) as { reason?: string };
      const reason = (body.reason ?? '').trim();
      if (reason.length < 10 || reason.length > 500) {
        return badRequest('a reason of 10–500 characters is required');
      }
      if (user.status === 'deactivated') return user;
      if (user.role === 'admin' && countActiveAdmins() <= 1) {
        return HttpResponse.json(
          {
            message: 'Mock API: this is the last active admin and cannot be deactivated',
            code: 'LAST_ADMIN',
          },
          { status: 409 },
        );
      }

      const updated: AdminUser = {
        ...user,
        status: 'deactivated',
        activeSessionCount: 0,
        deactivatedAt: new Date().toISOString(),
        deactivationReason: reason,
      };
      db.adminUsers = db.adminUsers.map((row) => (row.id === userId ? updated : row));
      return updated;
    }),
  ),

  http.post(
    '*/admin/users/:userId/reactivate',
    respond('json', ({ params }) => {
      const userId = paramId(params, 'userId');
      const user = db.adminUsers.find((row) => row.id === userId);
      if (!user) return notFound('user');
      const updated: AdminUser = {
        ...user,
        status: 'active',
        deactivatedAt: null,
        deactivationReason: null,
      };
      db.adminUsers = db.adminUsers.map((row) => (row.id === userId ? updated : row));
      return updated;
    }),
  ),

  http.get('*/admin/invites', respond('list', () => db.adminInvites)),

  http.post(
    '*/admin/invites',
    respond('json', async ({ request }) => {
      const body = (await request.json().catch(() => ({}))) as { email?: string };
      const email = (body.email ?? '').trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return badRequest('a valid email address is required');
      }
      if (db.adminInvites.some((invite) => invite.email === email)) {
        return conflict('an invite is already pending for that address');
      }
      const invite = {
        id: `inv-admin-${Date.now()}`,
        email,
        role: 'admin' as const,
        invitedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
        invitedByName: 'Al Admin (fake)',
      };
      db.adminInvites = [...db.adminInvites, invite];
      return invite;
    }),
  ),

  http.delete(
    '*/admin/invites/:inviteId',
    respond('json', ({ params }) => {
      const inviteId = paramId(params, 'inviteId');
      const exists = db.adminInvites.some((invite) => invite.id === inviteId);
      if (!exists) return notFound('invite');
      db.adminInvites = db.adminInvites.filter((invite) => invite.id !== inviteId);
      return { success: true };
    }),
  ),
];
