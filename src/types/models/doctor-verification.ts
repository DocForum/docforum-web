import type { VerificationStatus } from './session-idle-timeout';
import type { SpecialtyClaimCredential } from './specialty-verification-review';
import type { DoctorSummary, Specialty } from './stuck-referrals';

// --- Doctor verification (Phase W3 — assumed, docforum-core#52/#51 not
// landed) ------------------------------------------------------------------

export type CredentialType =
  | 'medical_license'
  | 'degree_certificate'
  | 'specialty_certificate'
  | 'identity_document'
  | 'other';

/** Items in a doctor's application are each verified individually
 * (docforum-core#51), so this is per-document/per-specialty, not the
 * profile-level `VerificationStatus`. */
export type ClaimItemStatus = 'pending' | 'verified' | 'rejected';

export interface DoctorCredential {
  id: string;
  doctorProfileId: string;
  type: CredentialType;
  /** Display label only. The backend stores a key behind a signed/get-on-demand
   * URL — never a permanent public URL, and never rendered as a link here. */
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  status: ClaimItemStatus;
  rejectionReason?: string | null;
  submittedAt: string;
  updatedAt: string;
}

/** Assumed (docforum-core#51): the doctor's own view of a specialty claim,
 * scoped by profile. The admin queue reads `SpecialtyClaim` below, which
 * carries the reviewer and doctor-summary projection instead. */
export interface DoctorSpecialtyClaim {
  id: string;
  doctorProfileId: string;
  specialtyId: string;
  specialty: Specialty;
  status: ClaimItemStatus;
  rejectionReason?: string | null;
  submittedAt: string;
  updatedAt: string;
}

/** One doctor↔specialty pair awaiting review (a `DoctorSpecialty` row). */
export interface SpecialtyClaim {
  id: string;
  doctorId: string;
  doctor: DoctorSummary;
  specialtyId: string;
  specialty: Specialty;
  /** Always `pending` while in the queue — decided claims leave it. */
  status: VerificationStatus;
  /** Null when the doctor attached nothing — approving then is a judgement
   * call the UI must not hide. */
  credential: SpecialtyClaimCredential | null;
  /** What the doctor was told to fix, when rejected. */
  rejectionReason: string | null;
  reviewedById: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  /** When the doctor attached the specialty — drives the age filter. */
  createdAt: string;
  updatedAt: string;
}

export type ClaimDecision = 'approve' | 'reject';

export interface ReviewSpecialtyClaimInput {
  decision: ClaimDecision;
  /** Required for `reject`: what the doctor must fix or resubmit — the
   * doctor sees it. Optional note for `approve`. */
  reason: string | null;
  /** The `updatedAt` the admin saw — lets docforum-core answer `409` if
   * someone else reviewed the claim in the meantime. */
  expectedUpdatedAt: string;
}
