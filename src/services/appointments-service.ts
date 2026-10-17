// Appointments service (Phase W2, issue #14 — detail page + atomic reschedule).
// All calls route through docforum-core's API per ARCHITECTURE_ESSENTIALS.md
// hard rule 1; `api-client.ts` stays the only place HTTP details live.
//
// Real (docforum-core Phase 1, docs/api/README.md):
//   GET  /appointments/mine
//   GET  /availability/doctors/:doctorProfileId/slots
// Assumed (documented in ARCHITECTURE_ESSENTIALS.md "Known assumptions"):
//   POST /appointments/:id/reschedule   — docforum-core#55 (open)
//   GET  /doctors/:doctorProfileId      — docforum-core#23 (open)
import { apiFetch } from './api-client';
import type { Appointment, AvailabilitySlot, DoctorProfile } from '../types/models';

/** Caller's own appointments, newest first, `availabilitySlot` included.
 * Note: the real payload carries no clinician name — see `getDoctorProfile`. */
export function listMyAppointments(accessToken: string): Promise<Appointment[]> {
  return apiFetch<Appointment[]>('/appointments/mine', { accessToken });
}

/** The same doctor's open, future slots, ascending. Public by design — the
 * backend deliberately requires no auth for availability. */
export function getOpenSlots(doctorProfileId: string): Promise<AvailabilitySlot[]> {
  return apiFetch<AvailabilitySlot[]>(`/availability/doctors/${doctorProfileId}/slots`);
}

/** ASSUMED: docforum-core has no public clinician read yet (its #23), so
 * `/appointments/mine` can only tell us `doctorProfileId`. Until that lands the
 * page falls back to a labelled "name unavailable" state — it never invents a
 * clinician name. A 404/403 here is a contract gap, not an error page. */
export function getDoctorProfile(doctorProfileId: string, accessToken: string): Promise<DoctorProfile> {
  return apiFetch<DoctorProfile>(`/doctors/${doctorProfileId}`, { accessToken });
}

/** ASSUMED (docforum-core#55): atomic swap — claim the new slot and release
 * the old one in one transaction, or change nothing.
 *   201/200 → the rescheduled appointment (same shape as the list row)
 *   409     → the new slot was taken; the appointment is untouched
 *   404     → unknown appointment, or the route is not deployed yet
 *   4xx     → e.g. rejected by the cutoff window (docforum-core#56) */
export function rescheduleAppointment(
  appointmentId: string,
  newSlotId: string,
  accessToken: string,
): Promise<Appointment> {
  return apiFetch<Appointment>(`/appointments/${appointmentId}/reschedule`, {
    method: 'POST',
    body: { newSlotId },
    accessToken,
  });
}
