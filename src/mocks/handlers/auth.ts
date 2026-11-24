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
let adminEnrollmentComplete = false;
let twoFactorEnabled = true;
const TWO_FACTOR_USER: User = { ...PATIENT_USER, email: 'two-factor@docforum.org' };
const ENROLLMENT_CODES = ['AAAAA-11111', 'BBBBB-22222', 'CCCCC-33333', 'DDDDD-44444', 'EEEEE-55555', 'FFFFF-66666', 'GGGGG-77777', 'HHHHH-88888', 'IIIII-99999', 'JJJJJ-00000'];

export function resetAuthMockState() {
  adminEnrollmentComplete = false;
  twoFactorEnabled = true;
}

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
      if (body.email === 'two-factor@docforum.org' && twoFactorEnabled) {
        return { mfaRequired: true, mfaToken: 'mock-mfa-token' };
      }
      if (body.email === 'admin-enrollment@docforum.org' && !adminEnrollmentComplete) {
        return { enrollmentRequired: true, enrollmentToken: 'mock-enrollment-token' };
      }
      if (body.email === 'admin-enrollment@docforum.org') {
        return { mfaRequired: true, mfaToken: 'mock-admin-mfa-token' };
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

  http.post(
    '*/auth/2fa/verify',
    respond('json', async ({ request }) => {
      const body = (await request.json().catch(() => ({}))) as { mfaToken?: string; code?: string };
      if (body.mfaToken === 'expired-mfa-token') {
        return HttpResponse.json({ code: 'INVALID_MFA_TOKEN', message: 'Verification expired' }, { status: 401 });
      }
      const code = body.code?.replace(/\s+/g, '').toUpperCase();
      if (code !== '123456' && !ENROLLMENT_CODES.includes(code ?? '')) {
        return HttpResponse.json({ code: 'INVALID_TOTP_CODE', message: 'Invalid authenticator code' }, { status: 401 });
      }
      const user = body.mfaToken === 'mock-admin-mfa-token' ? ADMIN_USER : TWO_FACTOR_USER;
      return sessionFor(user);
    }),
  ),

  http.post(
    '*/auth/2fa/setup',
    respond('json', () => ({
      secret: 'JBSWY3DPEHPK3PXP',
      otpauthUri: 'otpauth://totp/DocForum:mock@example.test?secret=JBSWY3DPEHPK3PXP&issuer=DocForum',
    })),
  ),

  http.post(
    '*/auth/2fa/enable',
    respond('json', async ({ request }) => {
      const body = (await request.json().catch(() => ({}))) as { code?: string };
      if (body.code !== '123456') {
        return HttpResponse.json({ code: 'INVALID_TOTP_CODE', message: 'Invalid authenticator code' }, { status: 400 });
      }
      adminEnrollmentComplete = true;
      twoFactorEnabled = true;
      return { recoveryCodes: ENROLLMENT_CODES };
    }),
  ),

  http.get(
    '*/auth/2fa/status',
    respond('json', () => ({ enabled: twoFactorEnabled, unusedRecoveryCodes: twoFactorEnabled ? 10 : 0 })),
  ),

  http.post(
    '*/auth/2fa/disable',
    respond('void', async ({ request }) => {
      const body = (await request.json().catch(() => ({}))) as { code?: string };
      if (body.code !== '123456') {
        return HttpResponse.json({ code: 'INVALID_TOTP_CODE', message: 'Invalid authenticator code' }, { status: 401 });
      }
      twoFactorEnabled = false;
      return null;
    }),
  ),

  http.post('*/auth/logout', respond('void', () => null)),

  http.post(
    '*/auth/claim-account',
    respond('void', () => null),
  ),
];
