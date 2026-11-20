// Appointments calls to docforum-core.
//
// `GET /appointments/mine` is REAL (its appointments/routes +
// appointments/repositories, which include the availability slot). The two
// check-in/queue calls are an assumed contract against docforum-core#129,
// which has not landed — see ARCHITECTURE_ESSENTIALS.md "Known assumptions".
//
// Nothing here needs the patient's own `patientProfileId`: core scopes
// `/appointments/mine` from the session, which is why the patient-facing
// endpoints in #32/#34/#37 are all built as `me`-scoped calls (the frontend
// has no way to learn that id — documented gap).
//
// Additional reads/writes for the appointment detail page (issue #14):
//   GET  /availability/doctors/:doctorProfileId/slots        (real)
//   POST /appointments/:id/reschedule                        (assumed, core#55)
//   GET  /doctors/:doctorProfileId                           (assumed, core#23)
import { apiFetch } from './api-client';
import type { AppointmentQueue, AvailabilitySlot, DoctorProfile, PatientAppointment } from '../types/models';

export function listMyAppointments(accessToken: string, signal?: AbortSignal): Promise<PatientAppointment[]> {
  return apiFetch<PatientAppointment[]>('/appointments/mine', { accessToken, signal });
}

/** assumed (core#129) */
export function getAppointmentQueue(appointmentId: string, accessToken: string, signal?: AbortSignal): Promise<AppointmentQueue> {
  return apiFetch<AppointmentQueue>(`/appointments/${appointmentId}/queue`, { accessToken, signal });
}

/** assumed (core#129) */
export function checkIn(appointmentId: string, accessToken: string): Promise<AppointmentQueue> {
  return apiFetch<AppointmentQueue>(`/appointments/${appointmentId}/check-in`, { method: 'POST', accessToken });
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
): Promise<PatientAppointment> {
  return apiFetch<PatientAppointment>(`/appointments/${appointmentId}/reschedule`, {
    method: 'POST',
    body: { newSlotId },
    accessToken,
  });
}
