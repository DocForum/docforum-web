// Patient appointment queue endpoints.
import { http } from 'msw';
import { db } from '../db';
import { respond } from '../helpers';
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
    '*/doctor/appointments/today',
    respond('list', () =>
      [...db.appointments].sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    ),
  ),

  http.get('*/doctor/queue/today', respond('list', () => deriveQueue(db.appointments))),
];

export { deriveQueue };
