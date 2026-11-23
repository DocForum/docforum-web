import { paths } from '../routes/paths';
import type { NavItem } from './types';

/** Facility navigation, in display order. */
export const facilityNavItems: NavItem[] = [
  { to: paths.facility.root, label: 'Queue', roles: ['facility'], messageId: 'nav.queue' },
  { to: paths.facility.verify, label: 'Verify Order', roles: ['facility'] },
  { to: paths.facility.team, label: 'Team', roles: ['facility'], messageId: 'nav.team' },
  { to: paths.facility.payments, label: 'Payouts', roles: ['facility'] },
  { to: paths.facility.integrations, label: 'Integrations', roles: ['facility'] },
  { to: paths.facility.insights, label: 'Insights', roles: ['facility'], messageId: 'nav.insights' },
  { to: paths.facility.settings, label: 'Settings', roles: ['facility'], messageId: 'nav.settings', group: 'secondary' },
];
