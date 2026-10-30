// Mirrors docforum-core's admin account lifecycle API (core#39).
// Assumed shapes are listed in ARCHITECTURE_ESSENTIALS.md "Known assumptions".

export type AdminUserRole = 'patient' | 'doctor' | 'facility' | 'admin';
export type AdminUserStatus = 'active' | 'deactivated';

export interface AdminUserSummary {
  id: string;
  name: string;
  email: string;
  role: AdminUserRole;
  status: AdminUserStatus;
  createdAt: string;
}

export interface AdminUserDetail extends AdminUserSummary {
  sessionsCount: number;
  deactivatedAt?: string | null;
  deactivationReason?: string | null;
}

export interface AdminUserListParams {
  search?: string;
  role?: AdminUserRole | '';
  status?: AdminUserStatus | '';
  page: number;
  pageSize: number;
}

export interface AdminUserListResponse {
  items: AdminUserSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export type AdminInviteStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

export interface AdminInvite {
  id: string;
  email: string;
  status: AdminInviteStatus;
  createdAt: string;
  expiresAt?: string | null;
}