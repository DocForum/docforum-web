import { paths } from '../routes/paths';
import type { NavItem } from './types';

/** Patient navigation, in display order. */
export const patientNavItems: NavItem[] = [
  { to: paths.patient.search, label: 'Find a doctor', roles: ['patient'], messageId: 'nav.findADoctor' },
  { to: '/patient/doctors', label: 'Browse by specialty', roles: ['patient'] },
  { to: '/patient/appointments', label: 'Appointments', roles: ['patient'] },
  { to: paths.care, label: 'Care journey', roles: ['patient', 'doctor'], messageId: 'nav.careJourney' },
  { to: paths.patient.dependents, label: 'Dependents', roles: ['patient'] },
  { to: paths.patient.health, label: 'Health profile', roles: ['patient'] },
  { to: paths.patient.facilities, label: 'Facilities', roles: ['patient'] },
  { to: paths.patient.orders, label: 'My orders', roles: ['patient'], messageId: 'nav.orders' },
  { to: paths.payments, label: 'Payments', roles: ['patient'], messageId: 'nav.payments', group: 'secondary' },
  { to: paths.patient.settings, label: 'Settings', roles: ['patient'], messageId: 'nav.settings', group: 'secondary' },
];
