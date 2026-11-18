import type { Role } from './fixtures';

// Every concrete route in App.tsx and PatientDashboardPage.tsx. Dynamic
// routes use the IDs in src/mocks/fixtures.ts; no real patient data is used.
export const routes: ReadonlyArray<{ path: string; role: Role; heading: string }> = [
  { path: '/', role: 'patient', heading: 'DocForum' },
  { path: '/login', role: 'patient', heading: 'Log in' },
  { path: '/signup', role: 'patient', heading: 'Sign up' },
  { path: '/claim-account', role: 'patient', heading: 'Claim' },
  { path: '/account-deleted', role: 'patient', heading: 'Account' },
  { path: '/care', role: 'patient', heading: 'Care' },
  { path: '/care/cth-demo-1', role: 'patient', heading: 'Care' },
  { path: '/patient', role: 'patient', heading: 'Welcome' },
  { path: '/patient/dependents', role: 'patient', heading: 'Dependents' },
  { path: '/patient/health', role: 'patient', heading: 'Health' },
  { path: '/patient/facilities', role: 'patient', heading: 'facilities' },
  { path: '/patient/settings', role: 'patient', heading: 'Account' },
  { path: '/patient/care', role: 'patient', heading: 'Care' },
  { path: '/doctor', role: 'doctor', heading: 'Doctor dashboard' },
  { path: '/doctor/insights', role: 'doctor', heading: 'insights' },
  { path: '/doctor/consultation/apt-demo-2', role: 'doctor', heading: 'Consultation' },
  { path: '/doctor/messages', role: 'doctor', heading: 'Messages' },
  { path: '/facility', role: 'facility', heading: 'Facility dashboard' },
  { path: '/facility/verify', role: 'facility', heading: 'Verify' },
  { path: '/facility/payments', role: 'facility', heading: 'Payout' },
  { path: '/facility/team', role: 'facility', heading: 'Team' },
  { path: '/admin', role: 'admin', heading: 'Welcome' },
  { path: '/admin/audit', role: 'admin', heading: 'Audit' },
  { path: '/admin/referrals', role: 'admin', heading: 'referrals' },
  { path: '/admin/system', role: 'admin', heading: 'System' },
  { path: '/admin/flags', role: 'admin', heading: 'Feature flags' },
  { path: '/missing-route', role: 'patient', heading: 'not found' },
];
