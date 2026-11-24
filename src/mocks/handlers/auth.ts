// Auth endpoints (signup / login / logout / claim-account).
import { http, HttpResponse } from 'msw';
import { ADMIN_USER, DOCTOR_USER, FACILITY_USER, MOCK_ACCESS_TOKEN, PATIENT_USER } from '../fixtures';
import { respond } from '../helpers';
import { useMockStore } from '../mock-store';
import { db } from '../db';
import type { Role, User } from '../../types/models';

const PERSONAS: Record<Role, User> = {
  patient: PATIENT_USER,
  doctor: DOCTOR_USER,
  facility: FACILITY_USER,
  admin: ADMIN_USER,
};

/** The seeded persona for a role, used by the dev panel role switcher. */
export function personaForRole(role: Role): User {
  const persona = PERSONAS[role];
  return {
    ...persona,
    emailVerifiedAt: db.verifiedEmails.get(persona.email) ?? null,
  };
}

/** Find a seeded persona by email (so logging in as one "just works"). */
export function personaByEmail(email: string): User | undefined {
  const persona = Object.values(PERSONAS).find((user) => user.email === email);
  if (!persona) return undefined;
  return {
    ...persona,
    emailVerifiedAt: db.verifiedEmails.get(persona.email) ?? null,
  };
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
        ...personaForRole(role),
        id: `usr-mock-${role}-new`,
        email: body.email,
        emailVerifiedAt: null,
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
      return sessionFor({ ...personaForRole(role), email: body.email });
    }),
  ),

  http.post('*/auth/logout', respond('void', () => null)),

  http.post(
    '*/auth/verify-email',
    respond('json', async ({ request }) => {
      const body = (await request.json().catch(() => ({}))) as { token?: string };
      if (
        !body.token ||
        body.token.startsWith('invalid') ||
        db.usedVerificationTokens.has(body.token)
      ) {
        return HttpResponse.json(
          { code: 'INVALID_VERIFICATION_TOKEN', message: 'Verification link is invalid' },
          { status: 400 },
        );
      }
      if (body.token.startsWith('expired')) {
        return HttpResponse.json(
          { code: 'VERIFICATION_TOKEN_EXPIRED', message: 'Verification link has expired' },
          { status: 400 },
        );
      }
      db.usedVerificationTokens.add(body.token);
      const emailVerifiedAt = new Date().toISOString();
      db.verifiedEmails.set(
        personaForRole(useMockStore.getState().activeRole).email,
        emailVerifiedAt,
      );
      return { emailVerifiedAt };
    }),
  ),

  http.post(
    '*/auth/verify-email/resend',
    respond('json', ({ request }) => {
      if (!request.headers.get('authorization')) {
        return HttpResponse.json(
          { code: 'UNAUTHORIZED', message: 'Sign in required' },
          { status: 401 },
        );
      }
      const persona = personaForRole(useMockStore.getState().activeRole);
      if (persona.emailVerifiedAt) {
        return HttpResponse.json(
          { code: 'EMAIL_ALREADY_VERIFIED', message: 'Email is already verified' },
          { status: 409 },
        );
      }
      return { resendAfterSeconds: 60 };
    }),
  ),

  http.post(
    '*/auth/claim-account',
    respond('void', () => null),
  ),
];
