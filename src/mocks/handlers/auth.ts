// Auth endpoints (signup / login / logout / claim-account / invite redemption).
import { http, HttpResponse } from 'msw';
import {
  ACCOUNT_INVITE,
  ADMIN_ACCOUNT_INVITE,
  ADMIN_USER,
  DOCTOR_USER,
  FACILITY_USER,
  MOCK_ACCESS_TOKEN,
  MOCK_CSRF_TOKEN,
  PATIENT_USER,
} from '../fixtures';
import { notFound, paramId, respond } from '../helpers';
import { useMockStore } from '../mock-store';
import type { AccountInvite, Role, User } from '../../types/models';

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
  return { user, accessToken: MOCK_ACCESS_TOKEN, csrfToken: MOCK_CSRF_TOKEN };
}

/** Mirrors docforum-core's cookie-only refresh: returns the current mock
 * persona session (the dev bootstrap always signs one in first). */
export function mockSessionForRole(role: Role) {
  return sessionFor(PERSONAS[role]);
}

/** The demo invite a token maps to, or null for an unknown token (404). */
function inviteForToken(token: string): AccountInvite | null {
  if (token === 'missing') return null;
  const base = token === 'admin-demo' ? ADMIN_ACCOUNT_INVITE : ACCOUNT_INVITE;
  if (token === 'expired-demo') return { ...base, status: 'expired' };
  if (token === 'revoked-demo') return { ...base, status: 'revoked' };
  if (token === 'used-demo') return { ...base, status: 'accepted' };
  return base;
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
    '*/auth/refresh',
    respond('json', () => sessionFor(PERSONAS[useMockStore.getState().activeRole])),
  ),

  http.post(
    '*/auth/claim-account',
    respond('void', () => null),
  ),

  // --- Invitation redemption (issue #81) ---------------------------------
  // The token decides everything about the invite — including the role it
  // grants — and any `role` in an accept body is ignored, mirroring the
  // real contract where docforum-core derives the role from the token
  // server-side (PRD OQ-2: no self-serve facility/admin signup).
  // Demo tokens: `admin-demo` → pending admin invite; `expired-demo` /
  // `revoked-demo` / `used-demo` → those statuses; `missing` → 404; any
  // other token → the pending facility invite.
  http.get(
    '*/auth/invites/:token',
    respond('json', ({ params }) => inviteForToken(paramId(params, 'token')) ?? notFound('invite')),
  ),

  http.post(
    '*/auth/invites/:token/accept',
    respond('json', async ({ request, params }) => {
      const invite = inviteForToken(paramId(params, 'token'));
      if (!invite) return notFound('invite');

      const body = (await request.json().catch(() => ({}))) as {
        email?: string;
        fullName?: string;
        password?: string;
      };
      if (!body.email) {
        return HttpResponse.json({ message: 'Mock API: email is required' }, { status: 400 });
      }
      if (body.email.toLowerCase() !== invite.email.toLowerCase()) {
        return HttpResponse.json(
          { message: 'Mock API: email does not match the invitation' },
          { status: 422 },
        );
      }
      // New-account accept carries a password; an existing user accepts
      // after logging in, so no password but a session is expected.
      if (!body.password && !request.headers.get('authorization')) {
        return HttpResponse.json(
          { message: 'Mock API: log in before accepting this invitation' },
          { status: 401 },
        );
      }
      if (invite.status !== 'pending') {
        return HttpResponse.json(
          { message: `Mock API: this invitation is ${invite.status}` },
          { status: 409 },
        );
      }

      const persona = invite.role === 'admin' ? ADMIN_USER : FACILITY_USER;
      return sessionFor({
        ...persona,
        id: `usr-mock-invited-${invite.role}`,
        email: body.email,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }),
  ),

  // Session idle-timeout settings (issue #82) — role-aware like the real
  // backend is expected to be (ARCHITECTURE_ESSENTIALS.md "Known
  // assumptions — Session idle timeout").
  http.get(
    '*/auth/session-timeout',
    respond('json', () => {
      const role = useMockStore.getState().activeRole;
      const idleTimeoutMinutes = role === 'admin' ? 10 : role === 'patient' ? 30 : 15;
      return { idleTimeoutMinutes, warningSeconds: 60 };
    }),
  ),
];
