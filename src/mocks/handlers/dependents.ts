// Dependents CRUD + handover invite endpoints. Specific `/patients/me/…`
// paths must be registered before generic `/patients/:profileId/…` ones.
import { http } from 'msw';
import { db } from '../db';
import { notFound, paramId, respond } from '../helpers';
import type { Dependent, DependentInput } from '../../types/models';

export const dependentHandlers = [
  http.get('*/patients/me/dependents', respond('list', () => db.dependents)),

  http.post(
    '*/patients/me/dependents',
    respond('json', async ({ request }) => {
      const body = (await request.json().catch(() => ({}))) as DependentInput;
      const now = new Date().toISOString();
      const dependent: Dependent = {
        id: `dep-mock-${Date.now()}`,
        guardianProfileId: db.dependents[0]?.guardianProfileId ?? 'prf-patient-demo',
        fullName: body.fullName ?? 'Unnamed (fake)',
        dateOfBirth: body.dateOfBirth ?? '2000-01-01',
        relationship: body.relationship ?? 'guardian',
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
