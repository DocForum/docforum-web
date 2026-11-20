import type { DoctorProfile } from './session-idle-timeout';

// --- Phase W6 — Stuck referrals console (issue #72) --------------------------
// ReferralStatus and Specialty are real (docforum-core schema.prisma); the
// Referral fields follow its ARCHITECTURE.md §4.4, which schema.prisma hasn't
// caught up with yet. The admin queue/candidate shapes are assumed —
// docforum-core#68 (admin referral operations) and #65 (loop detection)
// haven't landed. See ARCHITECTURE_ESSENTIALS.md "Known assumptions — Phase W6".

// `cancelled` is core's admin-initiated exit (issue #68), distinct from
// `expired` (no-show cascade gave up) and `declined` (patient said no).
export type ReferralStatus = 'pending' | 'accepted' | 'declined' | 'completed' | 'expired' | 'cancelled';

export interface Specialty {
  id: string;
  name: string;
  slug: string;
}

/** `snapshotNotes` is deliberately absent: it's encrypted clinical text that
 * the admin endpoints don't return and the console never needs. */
export interface Referral {
  id: string;
  sourceConsultationId: string;
  referringDoctorId: string;
  targetSpecialtyId: string;
  targetDoctorId: string | null;
  // docforum-core#65: the referral whose appointment produced this one.
  parentReferralId: string | null;
  status: ReferralStatus;
  resultingAppointmentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type DoctorSummary = Pick<DoctorProfile, 'id' | 'fullName'>;
