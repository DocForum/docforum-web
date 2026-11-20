import type { NavItem } from './types';

/** Facility navigation, in display order. */
export const facilityNavItems: NavItem[] = [
  { to: '/facility', label: 'Queue', roles: ['facility'], messageId: 'nav.queue' },
  { to: '/facility/verify', label: 'Verify Order', roles: ['facility'] },
  { to: '/facility/team', label: 'Team', roles: ['facility'], messageId: 'nav.team' },
  { to: '/facility/payments', label: 'Payouts', roles: ['facility'] },
  { to: '/facility/integrations', label: 'Integrations', roles: ['facility'] },
  { to: '/facility/insights', label: 'Insights', roles: ['facility'], messageId: 'nav.insights' },
  { to: '/facility/settings', label: 'Settings', roles: ['facility'], messageId: 'nav.settings', group: 'secondary' },
];
