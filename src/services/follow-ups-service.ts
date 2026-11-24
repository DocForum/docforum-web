import type { BookFollowUpResult, FollowUpRequest, FollowUpStatus } from '../types/models';
import { apiFetch } from './api-client';

export function listMyFollowUps(
  accessToken: string,
  status?: FollowUpStatus,
  signal?: AbortSignal,
): Promise<FollowUpRequest[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiFetch(`/follow-ups/mine${query}`, { accessToken, signal });
}

export function bookFollowUp(
  followUpId: string,
  availabilitySlotId: string,
  accessToken: string,
): Promise<BookFollowUpResult> {
  return apiFetch(`/follow-ups/${encodeURIComponent(followUpId)}/book`, {
    method: 'POST',
    body: { availabilitySlotId },
    accessToken,
  });
}
