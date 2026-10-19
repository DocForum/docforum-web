// User-facing copy for a failed reschedule. Pure, so the wording a patient
// sees under each failure mode is asserted in tests rather than discovered in
// production.
//
// Every message restates the original appointment, because the whole point of
// the backend's atomic swap (docforum-core#55) is that a failure changes
// nothing — the UI must say so instead of leaving the patient to infer it.
import { ApiError } from '../../services/api-client';
import type { Appointment } from '../../types/models';
import { formatSlotDateTime } from './slots';

export function rescheduleErrorCopy(error: unknown, appointment: Appointment): string {
  const original = formatSlotDateTime(appointment.availabilitySlot);

  if (error instanceof ApiError) {
    if (error.status === 409) {
      return `That time was just taken by someone else, so nothing changed. Your appointment is still ${original} — choose another time below.`;
    }
    if (error.status === 404) {
      return `Rescheduling isn't available on this deployment yet, so nothing changed. Your appointment is still ${original}.`;
    }
    const detail = error.message && error.message !== 'Not Found' ? error.message.trim() : '';
    return detail ? `${detail} Your appointment is still ${original}.` : `We couldn't move your appointment. Your appointment is still ${original}.`;
  }

  return `We couldn't reach DocForum to move your appointment, so nothing changed. Your appointment is still ${original}.`;
}

/** True when the failure means "the slot went to someone else" — the only case
 * that gets its own refresh of the picker (see useReschedule). */
export function isSlotTaken(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409;
}
