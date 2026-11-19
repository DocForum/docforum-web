import type { NavItem } from './types';

/** Admin navigation, in display order. */
export const adminNavItems: NavItem[] = [
  { to: '/admin', label: 'Payments', roles: ['admin'] },
  { to: '/admin/verifications', label: 'Verifications', roles: ['admin'] },
  { to: '/admin/verification', label: 'Specialty claims', roles: ['admin'] },
  { to: '/admin/referrals', label: 'Referrals', roles: ['admin'] },
  { to: '/admin/disputes', label: 'Disputes', roles: ['admin'] },
  { to: '/admin/audit', label: 'Audit trail', roles: ['admin'] },
  { to: '/admin/flags', label: 'Flags', roles: ['admin'] },
  { to: '/admin/catalogs', label: 'Catalogs', roles: ['admin'] },
  { to: '/admin/system', label: 'System', roles: ['admin'] },
];
