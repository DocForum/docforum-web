import { apiFetch } from './api-client';
import type {
  CancelReferralInput,
  CursorPage,
  DoctorAvailability,
  ReassignReferralInput,
  Referral,
  StuckReferral,
} from '../types/models';

/** Pending-age thresholds the queue offers, in docforum-core#68's
 * `olderThan` duration syntax. */
export type StuckAge = '24h' | '48h' | '72h' | '168h';

export interface StuckReferralQuery {
  olderThan: StuckAge;
  cursor?: string | null;
}

/** Assumed contract (docforum-core#68): oldest first, same `{items,
 * nextCursor}` envelope as the audit listings. */
export function listStuckReferrals(
  query: StuckReferralQuery,
  accessToken: string,
  signal?: AbortSignal,
): Promise<CursorPage<StuckReferral>> {
  const params = new URLSearchParams({ status: 'pending', olderThan: query.olderThan });
  if (query.cursor) params.set('cursor', query.cursor);
  return apiFetch<CursorPage<StuckReferral>>(`/admin/referrals?${params.toString()}`, { accessToken, signal });
}

/** Verified doctors in one specialty, with availability. The console still
 * re-checks eligibility on what comes back — see `eligibleCandidates`. */
export function listReassignCandidates(
  specialtyId: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<DoctorAvailability[]> {
  const params = new URLSearchParams({ specialtyId, verificationStatus: 'verified' });
  return apiFetch<DoctorAvailability[]>(`/admin/doctors?${params.toString()}`, { accessToken, signal });
}

export function reassignReferral(
  referralId: string,
  input: ReassignReferralInput,
  accessToken: string,
): Promise<Referral> {
  return apiFetch<Referral>(`/admin/referrals/${encodeURIComponent(referralId)}/reassign`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}

/** docforum-core notifies the patient; nothing to do client-side. */
export function cancelReferral(referralId: string, input: CancelReferralInput, accessToken: string): Promise<Referral> {
  return apiFetch<Referral>(`/admin/referrals/${encodeURIComponent(referralId)}/cancel`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}
