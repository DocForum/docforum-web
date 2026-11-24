// Patient appointment endpoints for the mock API: the patient's own list
// (`GET /appointments/mine`), the cancellation policy and the cancel write
// (issue #15). Shapes are the assumed ones documented in
// ARCHITECTURE_ESSENTIALS.md "Known assumptions — appointment cancellation".
import { http } from 'msw';
import { db } from '../db';
import { badRequest, conflict, notFound, paramId, respond } from '../helpers';
import type { CancellationPolicy, CancellationReason, PatientAppointment } from '../../types/models';

const REASONS: CancellationReason[] = [
  'schedule_conflict',
  'feeling_better',
  'transport',
  'found_other_care',
  'other',
];

const DEFAULT_POLICY: CancellationPolicy = {
  lateCancellationCutoffMinutes: 120,
  releaseSlotBeforeCutoff: true,
  releaseSlotAfterCutoff: true,
  recordLateCancellation: true,
  referralHandling: 'returns_to_referral_queue',
};

export const appointmentHandlers = [
  http.get('*/appointments/mine', respond('list', () => db.patientAppointments)),

  http.get(
    '*/appointments/:id/cancellation-policy',
    respond('json', ({ params }) => {
      const id = paramId(params);
      const appointment = db.patientAppointments.find((row) => row.id === id);
      if (!appointment) return notFound('appointment');
      return db.cancellationPolicies[id] ?? DEFAULT_POLICY;
    }),
  ),

  http.post(
    '*/appointments/:id/cancel',
    respond('json', async ({ params, request }) => {
      const id = paramId(params);
      const appointment = db.patientAppointments.find((row) => row.id === id);
      if (!appointment) return notFound('appointment');
      if (appointment.status !== 'scheduled') {
        return conflict('appointment is not scheduled, so it cannot be cancelled');
      }

      const body = (await request.json().catch(() => ({}))) as {
        reason?: CancellationReason;
        note?: string;
        expectedUpdatedAt?: string;
      };
      if (!body.reason || !REASONS.includes(body.reason)) {
        return badRequest('a cancellation reason is required');
      }
      if (body.expectedUpdatedAt && body.expectedUpdatedAt !== appointment.updatedAt) {
        return conflict('appointment changed since it was loaded');
      }

      const policy = db.cancellationPolicies[id] ?? DEFAULT_POLICY;
      const startMs = Date.parse(appointment.availabilitySlot.startTime);
      const late = Date.now() >= startMs - policy.lateCancellationCutoffMinutes * 60_000;
      const slotReleased = late ? policy.releaseSlotAfterCutoff : policy.releaseSlotBeforeCutoff;
      const cancelledAt = new Date().toISOString();

      const updated: PatientAppointment = {
        ...appointment,
        status: 'cancelled',
        availabilitySlot: {
          ...appointment.availabilitySlot,
          status: slotReleased ? 'open' : appointment.availabilitySlot.status,
        },
        updatedAt: cancelledAt,
      };

      db.patientAppointments = db.patientAppointments.map((row) =>
        row.id === id ? updated : row,
      );

      return {
        ...updated,
        cancellation: {
          cancelledAt,
          cancellationReason: body.reason,
          note: body.note ?? null,
          late,
          slotReleased,
        },
      };
    }),
  ),
];
