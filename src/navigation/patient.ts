import type { NavItem } from './types';

/** Patient navigation, in display order. */
export const patientNavItems: NavItem[] = [
  { to: '/patient/search', label: 'Find a doctor', roles: ['patient'], messageId: 'nav.findADoctor' },
  { to: '/care', label: 'Care journey', roles: ['patient', 'doctor'], messageId: 'nav.careJourney' },
  { to: '/patient/dependents', label: 'Dependents', roles: ['patient'] },
  { to: '/patient/health', label: 'Health profile', roles: ['patient'] },
  { to: '/patient/facilities', label: 'Facilities', roles: ['patient'] },
  { to: '/patient/settings', label: 'Settings', roles: ['patient'], messageId: 'nav.settings' },
];
