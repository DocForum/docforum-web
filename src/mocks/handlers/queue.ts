// Doctor queue endpoints: today's appointments, live queue, start/complete
// visits, running delay with manual override.
import { http } from 'msw';
import { db } from '../db';
import { conflict, notFound, paramId, respond } from '../helpers';
import type { Appointment, QueueEntry } from '../../types/models';

function deriveQueue(appointments: Appointment[]): QueueEntry[] {
  return appointments
    .filter((apt) => apt.checkInAt !== null)
    .sort((a, b) => String(a.checkInAt).localeCompare(String(b.checkInAt)))
    .map((apt, index) => ({
      appointmentId: apt.id,
      patientProfileId: apt.patientProfileId,
      fullName: apt.patientName,
      checkedInAt: String(apt.checkInAt),
      queuePosition: index + 1,
      status:
        apt.status === 'in_progress'
          ? 'in_progress'
          : apt.status === 'completed'
            ? 'completed'
            : 'checked_in',
    }));
}

export const queueHandlers = [
  http.get(
    '*/appointments/doctor/today',
    respond('list', () =>
      [...db.appointments].sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    ),
  ),

  http.get('*/doctor/queue/today', respond('list', () => deriveQueue(db.appointments))),

  http.patch(
    '*/appointments/:appointmentId/start',
    respond('json', ({ params }) => {
      const apt = db.appointments.find((a) => a.id === paramId(params, 'appointmentId'));
      if (!apt) return notFound('appointment');
      if (apt.status !== 'checked_in' || !apt.checkInAt) {
        return conflict('appointment must be scheduled and checked in before the visit can start');
      }
      apt.status = 'in_progress';
      apt.startedAt = new Date().toISOString();
      return apt;
    }),
  ),

  http.patch(
    '*/appointments/:appointmentId/complete',
    respond('json', ({ params }) => {
      const apt = db.appointments.find((a) => a.id === paramId(params, 'appointmentId'));
      if (!apt) return notFound('appointment');
      if (apt.status !== 'in_progress') {
        return conflict('appointment must be in progress before the visit can complete');
      }
      apt.status = 'completed';
      apt.completedAt = new Date().toISOString();
      return apt;
    }),
  ),

  http.get('*/doctor/queue/running-delay', respond('json', () => db.runningDelay)),

  http.patch(
    '*/doctor/queue/running-delay',
    respond('json', async ({ request }) => {
      const body = (await request.json().catch(() => ({}))) as {
        manualOverrideMin?: number | null;
      };
      const override = body.manualOverrideMin ?? null;
      db.runningDelay = {
        ...db.runningDelay,
        manualOverrideMin: override,
        effectiveDelayMin: override ?? db.runningDelay.computedDelayMin,
      };
      return db.runningDelay;
    }),
  ),
];

export { deriveQueue };
