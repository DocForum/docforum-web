import { paths } from '../routes/paths';
import type { NavItem } from './types';

/** Admin navigation, in display order. */
export const adminNavItems: NavItem[] = [
  { to: paths.admin.root, label: 'Payments', roles: ['admin'] },
  { to: paths.admin.verifications, label: 'Verifications', roles: ['admin'] },
  { to: paths.admin.verification, label: 'Specialty claims', roles: ['admin'] },
  { to: paths.admin.referrals, label: 'Referrals', roles: ['admin'] },
  { to: paths.admin.disputes, label: 'Disputes', roles: ['admin'], messageId: 'admin.nav.disputes' },
  { to: paths.admin.audit, label: 'Audit trail', roles: ['admin'], messageId: 'admin.nav.audit' },
  { to: paths.admin.flags, label: 'Flags', roles: ['admin'], messageId: 'admin.nav.flags' },
  { to: paths.admin.catalogs, label: 'Catalogs', roles: ['admin'] },
  { to: paths.admin.system, label: 'System', roles: ['admin'] },
];
