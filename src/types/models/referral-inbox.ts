import type { SlotAppointment } from './patient-appointment-view';
import type { DoctorProfile } from './session-idle-timeout';
import type { DoctorSummary, Referral, ReferralStatus, Specialty } from './stuck-referrals';

// --- Referral inbox (Phase W3 — assumed, docforum-core#5/#7 not landed) ---

/** Assumed (core `IntakeForm` is `{id, createdAt}` with `symptoms`/
 * `freeTextNotes` still TODO). This is the *snapshot copy* taken at
 * referral time — core's schema note is explicit that these must be copies,
 * not live references (ARCHITECTURE.md §4.4). */
export interface ReferralIntakeSnapshot {
  id: string;
  symptoms: string[];
  freeTextNotes?: string;
  submittedAt: string;
}

/** Minimal referring-doctor projection (assumed expansion). */
export interface ReferringDoctor {
  id: string;
  fullName: string;
}

export interface ReferralSummary {
  id: string;
  status: ReferralStatus;
  /** Mirrors core's real `snapshotNotes` — the referring doctor's note,
   * frozen at referral time. */
  snapshotNotes: string;
  referringDoctor: ReferringDoctor;
  targetSpecialty?: Specialty | null;
  // Assumed: `snapshotTakenAt` is a distinct field from core's `createdAt`.
  // If the real API only exposes `createdAt`, reconcile here.
  snapshotTakenAt: string;
  createdAt: string;
  updatedAt: string;
  /** Mirrors core's TODO `resultingAppointmentId`. */
  resultingAppointmentId?: string | null;
  appointment?: SlotAppointment | null;
}

export interface ReferralDetail extends ReferralSummary {
  intakeSnapshot: ReferralIntakeSnapshot;
}

export type StuckReferralReason = 'no_doctor' | 'doctor_inactive' | 'loop_flagged';

export interface ReferralChainLink {
  referralId: string;
  referringDoctor: DoctorSummary;
  targetSpecialty: Specialty;
  targetDoctor: DoctorSummary | null;
  status: ReferralStatus;
  createdAt: string;
}

export interface StuckReferral extends Referral {
  stuckReason: StuckReferralReason;
  targetSpecialty: Specialty;
  referringDoctor: DoctorSummary;
  targetDoctor: DoctorSummary | null;
  /** Oldest first, ending with this referral. Only sent for `loop_flagged`. */
  chain: ReferralChainLink[] | null;
}

/** A doctor as offered in the reassign picker, with near-term availability. */
export interface DoctorAvailability extends Pick<DoctorProfile, 'id' | 'fullName' | 'verificationStatus'> {
  specialties: Specialty[];
  // Open AvailabilitySlots in the next 7 days.
  openSlotCount: number;
  nextAvailableAt: string | null;
}

export interface ReassignReferralInput {
  targetDoctorId: string;
  reason: string;
  /** The `updatedAt` the admin saw — lets docforum-core answer `409` if
   * someone else acted on the referral in the meantime. */
  expectedUpdatedAt: string;
}

export interface CancelReferralInput {
  reason: string;
  expectedUpdatedAt: string;
}
