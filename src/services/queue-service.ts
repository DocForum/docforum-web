import type { Schemas } from '@docforum/api-client';
import { api, apiFetch } from './api-client';
import type { Appointment } from '../types/models';

export function listTodayAppointments(accessToken: string, signal?: AbortSignal): Promise<Schemas['Appointment'][]> {
  return api.queue.listTodayAppointments({ accessToken, signal });
}

export function listQueue(accessToken: string, signal?: AbortSignal): Promise<Schemas['QueueEntry'][]> {
  return api.queue.list({ accessToken, signal });
}

export function startVisit(appointmentId: string, accessToken: string): Promise<Schemas['Appointment']> {
  return api.queue.startVisit(appointmentId, { accessToken });
}

export function completeVisit(appointmentId: string, accessToken: string): Promise<Schemas['Appointment']> {
  return api.queue.completeVisit(appointmentId, { accessToken });
}

/** A doctor-settable outcome for a scheduled appointment. */
export type AppointmentStatusUpdate = 'completed' | 'cancelled' | 'no_show';

/**
 * `PATCH /appointments/:appointmentId/status` — the only way the doctor can
 * record a no-show or cancel a visit. docforum-core cascades to a linked
 * referral (back to pending, or expired after repeated no-shows). The typed
 * client has no method for it yet, so it goes through the shared client.
 */
export function updateAppointmentStatus(
  appointmentId: string,
  status: AppointmentStatusUpdate,
  accessToken: string,
): Promise<Appointment> {
  return apiFetch<Appointment>(`/appointments/${appointmentId}/status`, {
    method: 'PATCH',
    body: { status },
    accessToken,
  });
}

export function getRunningDelay(accessToken: string, signal?: AbortSignal): Promise<Schemas['RunningDelay']> {
  return api.queue.getRunningDelay({ accessToken, signal });
}

export function updateRunningDelay(
  input: Schemas['UpdateRunningDelayInput'],
  accessToken: string,
): Promise<Schemas['RunningDelay']> {
  return api.queue.updateRunningDelay(input, { accessToken });
}
