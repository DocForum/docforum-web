import { paths } from '../routes/paths';
import type { NavItem } from './types';

/** Doctor navigation, in display order. */
export const doctorNavItems: NavItem[] = [
  { to: paths.doctor.root, label: 'Dashboard', roles: ['doctor'], messageId: 'nav.dashboard' },
  { to: paths.doctor.messages, label: 'Messages', roles: ['doctor'], badge: 0 },
  { to: paths.doctor.insights, label: 'Insights', roles: ['doctor'], messageId: 'nav.insights' },
];
