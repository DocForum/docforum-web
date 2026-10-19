import type { Schemas } from '@docforum/api-client';
import { api } from './api-client';

export function listTodayAppointments(accessToken: string): Promise<Schemas['Appointment'][]> {
  return api.queue.listTodayAppointments({ accessToken });
}

export function listQueue(accessToken: string): Promise<Schemas['QueueEntry'][]> {
  return api.queue.list({ accessToken });
}

export function startVisit(appointmentId: string, accessToken: string): Promise<Schemas['Appointment']> {
  return api.queue.startVisit(appointmentId, { accessToken });
}

export function completeVisit(appointmentId: string, accessToken: string): Promise<Schemas['Appointment']> {
  return api.queue.completeVisit(appointmentId, { accessToken });
}

export function getRunningDelay(accessToken: string): Promise<Schemas['RunningDelay']> {
  return api.queue.getRunningDelay({ accessToken });
}

export function updateRunningDelay(
  input: Schemas['UpdateRunningDelayInput'],
  accessToken: string,
): Promise<Schemas['RunningDelay']> {
  return api.queue.updateRunningDelay(input, { accessToken });
}
