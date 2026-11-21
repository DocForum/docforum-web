import type { Role } from './core';

// --- Admin user management (Phase W6, issue #70) -----------------------------
// ASSUMED contract against docforum-core#39 ("Admin account lifecycle: secure
// bootstrap CLI, admin invites, and account deactivation"), which has not
// landed. See ARCHITECTURE_ESSENTIALS.md "Known assumptions — Phase W6".
// The list is deliberately PII-minimal: email, name, role and status only.

export type AdminUserStatus = 'active' | 'deactivated';

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  status: AdminUserStatus;
  /** Count of live sessions, so deactivation's effect is visible. */
  activeSessionCount: number;
  createdAt: string;
  lastActiveAt?: string | null;
  deactivatedAt?: string | null;
  deactivationReason?: string | null;
}

export interface AdminUserPage {
  items: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
}

export type AdminUserRoleFilter = Role | 'all';
export type AdminUserStatusFilter = AdminUserStatus | 'all';

export interface AdminUserQuery {
  search: string;
  role: AdminUserRoleFilter;
  status: AdminUserStatusFilter;
  page: number;
  pageSize: number;
}

export interface DeactivateAdminUserInput {
  /** Required, 10–500 characters — it is written to the audit trail. */
  reason: string;
}

/** A pending admin invitation. */
export interface AdminInvite {
  id: string;
  email: string;
  role: 'admin';
  invitedAt: string;
  expiresAt: string;
  invitedByName?: string | null;
}

export interface SendAdminInviteInput {
  email: string;
}
