import { apiFetch } from './api-client';
import type { IntakeForm } from '../types/models';

export function getAppointmentIntake(
  appointmentId: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<IntakeForm | null> {
  return apiFetch<IntakeForm | null>(`/appointments/${appointmentId}/intake`, {
    accessToken,
    signal,
  });
}
