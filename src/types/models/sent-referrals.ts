import type { DoctorSummary, ReferralStatus, Specialty } from './stuck-referrals';

// --- Referrals I've sent (Phase W3, issue #265) ------------------------------
// Shape mirrors docforum-core's `GET /referrals/created`, which returns the
// Referral rows directly (an array, not a cursor page). Names for the target
// doctor/specialty are not expanded by core today — the fields below are
// assumed to arrive when the API expands them; see
// ARCHITECTURE_ESSENTIALS.md "Known assumptions — Phase W3 — referrals I've
// sent".

/** Why the no-show cascade gave up: nobody accepted in time, or the patient
 * repeatedly missed referral-origin appointments. */
export type ReferralExpiryReason = 'ttl' | 'no_show';

export interface SentReferral {
  id: string;
  status: ReferralStatus;
  /** Always set on a referral — core routes specialty-only targets to a
   * concrete doctor at creation. */
  targetDoctorId: string;
  targetSpecialtyId: string | null;
  /** Set when repeated no-shows expired the referral and the referring
   * doctor must be told. */
  referringDoctorNotifiedAt: string | null;
  /** The loop guard flagged this referral (a doctor/specialty already in its
   * ancestor chain); it is still created for a human to decide. */
  loopFlaggedAt: string | null;
  loopFlagReason: string | null;
  noShowCount: number;
  expiredAt: string | null;
  expiredReason: ReferralExpiryReason | null;
  resultingAppointmentId: string | null;
  createdAt: string;
  updatedAt: string;

  /** Assumed expansions of the ids above (see the file header). The view
   * falls back to a short id when core sends only the raw columns. */
  targetDoctor?: DoctorSummary | null;
  targetSpecialty?: Specialty | null;
}
