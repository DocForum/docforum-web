import { http } from 'msw';
import { db } from '../db';
import { respond } from '../helpers';

// Assumed onboarding summaries (#121) — flags are computed server-side from
// real records in the real API; the mock returns seeded state.
export const onboardingHandlers = [
  http.get('*/patients/me/onboarding', respond('json', () => db.onboarding.patient)),
  http.get('*/doctors/me/onboarding', respond('json', () => db.onboarding.doctor)),
];
