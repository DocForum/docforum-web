import { apiFetch } from './api-client';
import type {
  AuditEvent,
  CancelReferralInput,
  CursorPage,
  DoctorAvailability,
  ReassignReferralInput,
  Referral,
  StuckReferral,
} from '../types/models';

/** Pending-age thresholds the queue offers, mapped to docforum-core#68's
 * `olderThan` duration syntax. The console offers 1/2/3/7-day thresholds. */
export type StuckAge = '24h' | '48h' | '72h' | '168h';

export interface StuckReferralQuery {
  olderThan: StuckAge;
  cursor?: string | null;
}

/** docforum-core#68: GET /referrals/admin/queue returns stuck referrals. */
export function listStuckReferrals(
  query: StuckReferralQuery,
  accessToken: string,
  signal?: AbortSignal,
): Promise<CursorPage<StuckReferral>> {
  const params = new URLSearchParams({ olderThan: query.olderThan });
  if (query.cursor) params.set('cursor', query.cursor);
  return apiFetch<CursorPage<StuckReferral>>(`/referrals/admin/queue?${params.toString()}`, { accessToken, signal });
}

/** docforum-core#68: verified doctors in one specialty with availability. */
export function listReassignCandidates(
  specialtyId: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<DoctorAvailability[]> {
  const params = new URLSearchParams({ specialtyId, verificationStatus: 'verified' });
  return apiFetch<DoctorAvailability[]>(`/admin/doctors?${params.toString()}`, { accessToken, signal });
}

/** docforum-core#68: POST /referrals/admin/:id/reassign */
export function reassignReferral(
  referralId: string,
  input: ReassignReferralInput,
  accessToken: string,
): Promise<Referral> {
  return apiFetch<Referral>(`/referrals/admin/${encodeURIComponent(referralId)}/reassign`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}

/** docforum-core notifies the patient; nothing to do client-side. */
export function cancelReferral(referralId: string, input: CancelReferralInput, accessToken: string): Promise<Referral> {
  return apiFetch<Referral>(`/referrals/admin/${encodeURIComponent(referralId)}/cancel`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}

/** docforum-core#68: GET /referrals/admin/:id/audit-events */
export function listReferralAuditEvents(
  referralId: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<AuditEvent[]> {
  return apiFetch<AuditEvent[]>(`/referrals/admin/${encodeURIComponent(referralId)}/audit-events`, { accessToken, signal });
}
