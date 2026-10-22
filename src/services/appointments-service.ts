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
import { apiFetch } from './api-client';
import type { PatientAppointment, AppointmentQueue } from '../types/models';

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
