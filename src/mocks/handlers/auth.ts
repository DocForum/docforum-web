// Auth endpoints (signup / login / logout / claim-account).
import { http, HttpResponse } from 'msw';
import { ADMIN_USER, DOCTOR_USER, FACILITY_USER, MOCK_ACCESS_TOKEN, PATIENT_USER } from '../fixtures';
import { respond } from '../helpers';
import { useMockStore } from '../mock-store';
import type { Role, User } from '../../types/models';

const PERSONAS: Record<Role, User> = {
  patient: PATIENT_USER,
  doctor: DOCTOR_USER,
  facility: FACILITY_USER,
  admin: ADMIN_USER,
};

/** The seeded persona for a role, used by the dev panel role switcher. */
export function personaForRole(role: Role): User {
  return PERSONAS[role];
}

/** Find a seeded persona by email (so logging in as one "just works"). */
export function personaByEmail(email: string): User | undefined {
  return Object.values(PERSONAS).find((user) => user.email === email);
}

function sessionFor(user: User) {
  return { user, accessToken: MOCK_ACCESS_TOKEN };
}

export const authHandlers = [
  http.post(
    '*/auth/signup',
    respond('json', async ({ request }) => {
      const body = (await request.json().catch(() => ({}))) as {
        role?: Role;
        email?: string;
        password?: string;
        fullName?: string;
      };
      if (!body.email || !body.password) {
        return HttpResponse.json({ message: 'Mock API: email and password are required' }, { status: 400 });
      }
      const role: Role = body.role === 'doctor' ? 'doctor' : 'patient';
      return sessionFor({
        ...PERSONAS[role],
        id: `usr-mock-${role}-new`,
        email: body.email,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }),
  ),

  http.post(
    '*/auth/login',
    respond('json', async ({ request }) => {
      const body = (await request.json().catch(() => ({}))) as {
        email?: string;
        password?: string;
      };
      if (!body.email || !body.password) {
        return HttpResponse.json({ message: 'Mock API: email and password are required' }, { status: 400 });
      }
      // Any seeded persona email logs in as that persona directly.
      const known = personaByEmail(body.email);
      if (known) return sessionFor(known);
      // Anything else logs in as the dev panel's active role, keeping the
      // submitted email so the UI feels real.
      const role = useMockStore.getState().activeRole;
      return sessionFor({ ...PERSONAS[role], email: body.email });
    }),
  ),

  http.post('*/auth/logout', respond('void', () => null)),

  http.post(
    '*/auth/claim-account',
    respond('void', () => null),
  ),
];
