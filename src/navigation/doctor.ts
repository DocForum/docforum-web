import type { NavItem } from './types';

/** Doctor navigation, in display order. */
export const doctorNavItems: NavItem[] = [
  { to: '/doctor', label: 'Dashboard', roles: ['doctor'], messageId: 'nav.dashboard' },
  { to: '/doctor/messages', label: 'Messages', roles: ['doctor'], badge: 0 },
  { to: '/doctor/insights', label: 'Insights', roles: ['doctor'], messageId: 'nav.insights' },
];
