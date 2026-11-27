// Patient-facing referral calls (issue #4).
//
// ASSUMED contract — docforum-core's referral accept/decline endpoints (its
// issues #5–#8) are not merged yet. See ARCHITECTURE_ESSENTIALS.md "Known
// assumptions". Per PRD OQ-3 a referral is never auto-booked: nothing here
// creates an appointment implicitly, and accepting is the only call that
// produces one.
//
//   GET  /patients/me/referrals          -> PatientReferralList
//   POST /referrals/:id/accept           -> AcceptReferralResult
//   POST /referrals/:id/decline          -> DeclineReferralResult
//
// Accept answers 409 when the referral was already answered or withdrawn,
// and 404 when it is not this patient's. Both are shown as "someone else
// already acted" rather than a generic failure.
import { apiFetch } from './api-client';
import type {
  AcceptReferralResult,
  DeclineReferralResult,
  PatientReferralList,
} from '../types/models';

export function listMyReferrals(
  accessToken: string,
  signal?: AbortSignal,
): Promise<PatientReferralList> {
  return apiFetch<PatientReferralList>('/patients/me/referrals', { accessToken, signal });
}

export function acceptReferral(
  referralId: string,
  accessToken: string,
): Promise<AcceptReferralResult> {
  return apiFetch<AcceptReferralResult>(`/referrals/${referralId}/accept`, {
    method: 'POST',
    accessToken,
  });
}

export function declineReferral(
  referralId: string,
  accessToken: string,
): Promise<DeclineReferralResult> {
  return apiFetch<DeclineReferralResult>(`/referrals/${referralId}/decline`, {
    method: 'POST',
    accessToken,
  });
}
