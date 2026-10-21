import { apiFetch } from './api-client';
import type { FollowUpRequest, BookFollowUpInput, PatientAppointment } from '../types/models';

export function listMyFollowUpRequests(
  accessToken: string,
  signal?: AbortSignal
): Promise<FollowUpRequest[]> {
  return apiFetch<FollowUpRequest[]>('/follow-up-requests/mine', {
    accessToken,
    signal,
  });
}

export function bookFollowUp(
  input: BookFollowUpInput,
  accessToken: string
): Promise<PatientAppointment> {
  return apiFetch<PatientAppointment>(`/follow-up-requests/${input.followUpRequestId}/book`, {
    method: 'POST',
    body: { slotId: input.slotId },
    accessToken,
  });
}
