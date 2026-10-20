// Auth endpoints (signup / login / logout / claim-account / sessions).
import { http, HttpResponse } from 'msw';
import { ADMIN_USER, DOCTOR_USER, FACILITY_USER, MOCK_ACCESS_TOKEN, PATIENT_USER } from '../fixtures';
import { notFound, respond } from '../helpers';
import { useMockStore } from '../mock-store';
import type { ActiveSession, Role, User } from '../../types/models';

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

// Mock active sessions (issue #79). Coarse device/location only, matching the
// assumed contract — never an IP address, not even a fake one.
function seedSessions(): ActiveSession[] {
  const now = Date.now();
  return [
    {
      id: 'sess-current',
      device: 'Chrome on Linux',
      approximateLocation: 'Lagos, Nigeria',
      lastActiveAt: new Date(now).toISOString(),
      createdAt: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
      isCurrent: true,
    },
    {
      id: 'sess-kiosk',
      device: 'Clinic kiosk · Firefox',
      approximateLocation: 'Abuja, Nigeria',
      lastActiveAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString(),
      isCurrent: false,
    },
    {
      id: 'sess-phone',
      device: 'iPhone · Safari',
      approximateLocation: null,
      lastActiveAt: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString(),
      isCurrent: false,
    },
  ];
}

let mockSessions: ActiveSession[] = seedSessions();

export function resetMockSessions(): void {
  mockSessions = seedSessions();
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

  // Active sessions (issue #79). `others` is listed before `:sessionId` so
  // the literal path wins.
  http.get('*/auth/sessions', respond('list', () => mockSessions)),

  http.delete(
    '*/auth/sessions/others',
    respond('json', () => {
      const revokedCount = mockSessions.filter((session) => !session.isCurrent).length;
      mockSessions = mockSessions.filter((session) => session.isCurrent);
      return { revokedCount };
    }),
  ),

  http.delete(
    '*/auth/sessions/:sessionId',
    respond('void', ({ params }) => {
      const id = String(params.sessionId);
      const index = mockSessions.findIndex((session) => session.id === id);
      if (index === -1) return notFound('session');
      mockSessions.splice(index, 1);
      return null;
    }),
  ),
];
