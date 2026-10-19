import { apiFetch } from './api-client';
import type { Appointment, QueueEntry, RunningDelay, UpdateRunningDelayInput } from '../types/models';

export function listTodayAppointments(accessToken: string): Promise<Appointment[]> {
  return apiFetch<Appointment[]>('/doctor/appointments/today', { accessToken });
}

export function listQueue(accessToken: string): Promise<QueueEntry[]> {
  return apiFetch<QueueEntry[]>('/doctor/queue/today', { accessToken });
}

export function startVisit(appointmentId: string, accessToken: string): Promise<Appointment> {
  return apiFetch<Appointment>(`/appointments/${appointmentId}/start`, {
    method: 'POST',
    accessToken,
  });
}

export function completeVisit(appointmentId: string, accessToken: string): Promise<Appointment> {
  return apiFetch<Appointment>(`/appointments/${appointmentId}/complete`, {
    method: 'POST',
    accessToken,
  });
}

export function getRunningDelay(accessToken: string): Promise<RunningDelay> {
  return apiFetch<RunningDelay>('/doctor/queue/running-delay', { accessToken });
}

export function updateRunningDelay(input: UpdateRunningDelayInput, accessToken: string): Promise<RunningDelay> {
  return apiFetch<RunningDelay>('/doctor/queue/running-delay', {
    method: 'PATCH',
    body: input,
    accessToken,
  });
}
