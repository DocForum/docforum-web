// Dependents CRUD + handover invite endpoints. Specific `/patients/me/…`
// paths must be registered before generic `/patients/:profileId/…` ones.
//
// POST mirrors docforum-core's strict contract: only `fullName` and
// `dateOfBirth` are accepted (anything else is a 400), and a date of birth at
// or over the age of majority is `400 DEPENDENT_NOT_A_MINOR`.
import { http } from 'msw';
import { db } from '../db';
import { badRequest, notFound, paramId, respond } from '../helpers';
import { isMinor, parseDateOnly, validateDependentDob } from '../../features/dependents/age';
import { DEPENDENT_NOT_A_MINOR } from '../../services/error-catalogue';
import type { Dependent, DependentInput } from '../../types/models';

const CREATE_FIELDS = ['fullName', 'dateOfBirth'];

export const dependentHandlers = [
  http.get('*/patients/me/dependents', respond('list', () => db.dependents)),

  http.post(
    '*/patients/me/dependents',
    respond('json', async ({ request }) => {
      const payload = await request.json().catch(() => null);
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return badRequest('Expected a JSON object.', 'VALIDATION_ERROR');
      }

      const body = payload as Record<string, unknown>;
      const unexpected = Object.keys(body).find((key) => !CREATE_FIELDS.includes(key));
      if (unexpected) {
        return badRequest(`Unexpected field: ${unexpected}`, 'VALIDATION_ERROR');
      }

      const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
      const dateOfBirth = typeof body.dateOfBirth === 'string' ? body.dateOfBirth : '';
      if (!fullName) return badRequest('fullName is required.', 'VALIDATION_ERROR');

      const dobError = validateDependentDob(dateOfBirth);
      if (dobError) {
        const parsed = parseDateOnly(dateOfBirth);
        const code = parsed && !isMinor(dateOfBirth) ? DEPENDENT_NOT_A_MINOR : 'VALIDATION_ERROR';
        return badRequest(dobError, code);
      }

      const now = new Date().toISOString();
      const dependent: Dependent = {
        id: `dep-mock-${Date.now()}`,
        guardianProfileId: db.dependents[0]?.guardianProfileId ?? 'prf-patient-demo',
        fullName,
        dateOfBirth,
        // docforum-core derives relationship on create; POST never sends it.
        relationship: 'guardian',
        handoverStatus: 'not_eligible',
        createdAt: now,
        updatedAt: now,
      };
      db.dependents.push(dependent);
      return dependent;
    }),
  ),

  http.patch(
    '*/patients/me/dependents/:id',
    respond('json', async ({ params, request }) => {
      const dependent = db.dependents.find((d) => d.id === paramId(params));
      if (!dependent) return notFound('dependent');
      const body = (await request.json().catch(() => ({}))) as Partial<DependentInput>;
      Object.assign(dependent, body, { updatedAt: new Date().toISOString() });
      return dependent;
    }),
  ),

  http.post(
    '*/patients/me/dependents/:id/handover-invite',
    respond('json', async ({ params, request }) => {
      const dependent = db.dependents.find((d) => d.id === paramId(params));
      if (!dependent) return notFound('dependent');
      const body = (await request.json().catch(() => ({}))) as { email?: string };
      dependent.handoverStatus = 'invited';
      dependent.claimEmail = body.email ?? dependent.claimEmail;
      dependent.claimInviteExpiresAt = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      ).toISOString();
      dependent.updatedAt = new Date().toISOString();
      return dependent;
    }),
  ),

  http.post(
    '*/patients/me/dependents/:id/handover-invite/resend',
    respond('json', ({ params }) => {
      const dependent = db.dependents.find((d) => d.id === paramId(params));
      if (!dependent) return notFound('dependent');
      dependent.claimInviteExpiresAt = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      ).toISOString();
      dependent.updatedAt = new Date().toISOString();
      return dependent;
    }),
  ),
];
