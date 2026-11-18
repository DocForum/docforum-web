// HTTP surface for the specialist referral inbox (issue #41).
//
// A referral payload carries the IMMUTABLE SNAPSHOT of the original intake
// plus the referring doctor's notes (docforum-core ARCHITECTURE.md §4.4 —
// the snapshot fields must be copies, not live references). That is why this
// is the only service the referrals feature touches: there is deliberately
// no "fetch the original consultation notes" call here, and #41's review
// criterion is that no live-notes endpoint is substituted for the snapshot.
//
// Assumed contract (docforum-core#5/#7 not landed yet) — see
// ARCHITECTURE_ESSENTIALS.md "Known assumptions":
//   GET /doctors/me/referrals?status=&cursor=&limit=20 -> CursorPage<ReferralSummary>
//   GET /referrals/:id -> ReferralDetail (403/404 when reassigned to another specialist)
import { apiFetch } from './api-client';
import type { CursorPage, ReferralDetail, ReferralStatus, ReferralSummary } from '../types/models';

/** Inbox filter values accepted by `GET /doctors/me/referrals`. `'upcoming'`
 * is assumed as a server-side view filter (referrals whose resulting
 * appointment is scheduled) — filtering it client-side would fight the
 * server's cursor pagination, so it is sent as a status value. */
export type ReferralInboxFilter = ReferralStatus | 'upcoming';

export interface ListReferralsParams {
  status?: ReferralInboxFilter | null;
  cursor?: string | null;
  limit?: number;
}

export function listReferrals(
  { status, cursor, limit }: ListReferralsParams,
  accessToken: string,
): Promise<CursorPage<ReferralSummary>> {
  const query = new URLSearchParams();
  if (status) query.set('status', status);
  if (cursor) query.set('cursor', cursor);
  if (limit) query.set('limit', String(limit));
  const qs = query.toString();
  return apiFetch<CursorPage<ReferralSummary>>(`/doctors/me/referrals${qs ? `?${qs}` : ''}`, { accessToken });
}

export function getReferralDetail(referralId: string, accessToken: string): Promise<ReferralDetail> {
  return apiFetch<ReferralDetail>(`/referrals/${referralId}`, { accessToken });
}
