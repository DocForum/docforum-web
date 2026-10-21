import { apiFetch } from './api-client';
import type { PendingReferral, AcceptReferralResponse } from '../types/models';

export function listPendingReferrals(
  accessToken: string,
  signal?: AbortSignal
): Promise<PendingReferral[]> {
  return apiFetch<PendingReferral[]>('/referrals/pending', {
    accessToken,
    signal,
  });
}

export function acceptReferral(
  referralId: string,
  accessToken: string
): Promise<AcceptReferralResponse> {
  return apiFetch<AcceptReferralResponse>(`/referrals/${referralId}/accept`, {
    method: 'POST',
    accessToken,
  });
}

export function declineReferral(
  referralId: string,
  accessToken: string
): Promise<{ success: boolean; referralId: string }> {
  return apiFetch<{ success: boolean; referralId: string }>(`/referrals/${referralId}/decline`, {
    method: 'POST',
    accessToken,
  });
}
