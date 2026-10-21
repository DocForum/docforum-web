import { apiFetch } from './api-client';
import type { AvailabilitySlot, CreateBookingInput, PatientAppointment } from '../types/models';

export function listDoctorSlots(
  doctorId: string,
  accessToken: string,
  windowStart?: string,
  windowEnd?: string,
  signal?: AbortSignal
): Promise<AvailabilitySlot[]> {
  const query = new URLSearchParams();
  if (windowStart) query.set('start', windowStart);
  if (windowEnd) query.set('end', windowEnd);
  const queryString = query.toString() ? `?${query.toString()}` : '';

  return apiFetch<AvailabilitySlot[]>(`/doctors/${doctorId}/slots${queryString}`, {
    accessToken,
    signal,
  });
}

export function createBooking(
  input: CreateBookingInput,
  accessToken: string
): Promise<PatientAppointment> {
  return apiFetch<PatientAppointment>('/appointments', {
    method: 'POST',
    body: input,
    accessToken,
  });
}
