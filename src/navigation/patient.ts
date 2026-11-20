import { paths } from '../routes/paths';
import type { NavItem } from './types';

/** Patient navigation, in display order. */
export const patientNavItems: NavItem[] = [
  { to: paths.patient.search, label: 'Find a doctor', roles: ['patient'], messageId: 'nav.findADoctor' },
  { to: paths.care, label: 'Care journey', roles: ['patient', 'doctor'], messageId: 'nav.careJourney' },
  { to: paths.patient.dependents, label: 'Dependents', roles: ['patient'] },
  { to: paths.patient.health, label: 'Health profile', roles: ['patient'] },
  { to: paths.patient.facilities, label: 'Facilities', roles: ['patient'] },
  { to: paths.patient.settings, label: 'Settings', roles: ['patient'], messageId: 'nav.settings' },
];
