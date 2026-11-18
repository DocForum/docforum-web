import type { Schemas } from '@docforum/api-client';
import { api } from './api-client';

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

export function getRunningDelay(accessToken: string, signal?: AbortSignal): Promise<Schemas['RunningDelay']> {
  return api.queue.getRunningDelay({ accessToken, signal });
}

export function updateRunningDelay(
  input: Schemas['UpdateRunningDelayInput'],
  accessToken: string,
): Promise<Schemas['RunningDelay']> {
  return api.queue.updateRunningDelay(input, { accessToken });
}
