import { apiFetch } from './api-client';
import type { Appointment } from '../types/models';

export function getAppointmentById(appointmentId: string, accessToken: string): Promise<Appointment> {
  return apiFetch<Appointment>(`/appointments/${appointmentId}`, { accessToken });
}
