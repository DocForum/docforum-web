import type { AppointmentStatus } from './doctor-core-flow';
import type { DoctorSummary, Referral, Specialty } from './stuck-referrals';

// --- Patient referral accept/decline (Phase W2 — issue #4) ------------------
// ASSUMED contract: docforum-core issues #5–#8 (referral creation and the
// patient accept/decline endpoints) are not merged yet. `Referral` itself is
// the shape the rest of this repo already mirrors (see stuck-referrals.ts);
// everything below only adds the projections a patient has to see. Recorded
// in ARCHITECTURE_ESSENTIALS.md "Known assumptions".

/** The appointment accepting a referral creates. Accepting never asks the
 * patient to re-enter intake: if docforum-core still needs one, the referral
 * says so and the UI sends the patient to the intake form with the details
 * already carried over. */
export interface ReferralAppointment {
  id: string;
  startsAt: string;
  endsAt: string;
  doctorName: string;
  status: AppointmentStatus;
  /** `true` when docforum-core still needs the patient's intake before the
   * visit. The appointment exists either way — this only routes the patient
   * to the intake step. */
  requiresIntake: boolean;
}

export interface PatientReferral extends Referral {
  targetSpecialty: Specialty;
  referringDoctor: DoctorSummary;
  targetDoctor: DoctorSummary | null;
  /** Present once the referral has been accepted. `null` while pending, and
   * on declined/expired referrals. */
  appointment: ReferralAppointment | null;
  /** The patient's own copy of the referring doctor's note, so they can see
   * what the referral is about before deciding. */
  referralNote?: string | null;
}

export interface PatientReferralList {
  items: PatientReferral[];
}

/** Response to `POST /referrals/:id/accept`. The appointment is always
 * created by docforum-core — the UI must never show a bare status flip. */
export interface AcceptReferralResult {
  referral: PatientReferral;
  appointment: ReferralAppointment;
}

export interface DeclineReferralResult {
  referral: PatientReferral;
}
