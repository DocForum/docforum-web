import type { PatientAppointment } from './patient-appointment-view';

// --- Appointment cancellation (Phase W2, issue #15) --------------------------
// ASSUMED contract against docforum-core#56 ("Cancellation policy: patient/
// doctor cancellation, cutoff windows, and slot release"), which has not
// landed. The policy is read from the backend rather than hard-coded here —
// the whole point of the issue is that the copy must match the real policy
// values. See ARCHITECTURE_ESSENTIALS.md "Known assumptions — appointment
// cancellation" (docs.d/15-appointment-cancellation.md).

/** Why the patient cancelled. The picker offers these; the note is free text. */
export type CancellationReason =
  | 'schedule_conflict'
  | 'feeling_better'
  | 'transport'
  | 'found_other_care'
  | 'other';

/**
 * Policy values docforum-core would report for one appointment. `cutoffMinutes`
 * is measured back from the slot's start time; cancelling at or after it is a
 * late cancellation.
 */
export interface CancellationPolicy {
  /** Minutes before the appointment start after which a cancellation is late. */
  lateCancellationCutoffMinutes: number;
  /** Whether the slot returns to the doctor's open pool when cancelled on time. */
  releaseSlotBeforeCutoff: boolean;
  /** Whether the slot is still released when the cancellation is late. */
  releaseSlotAfterCutoff: boolean;
  /** Whether a late cancellation is recorded on the patient's account. */
  recordLateCancellation: boolean;
  /** What happens to the referral behind a referral-origin appointment. */
  referralHandling: 'returns_to_referral_queue' | 'referral_unaffected' | 'referral_closed';
}

export interface CancelAppointmentInput {
  reason: CancellationReason;
  /** Optional free text, shown to the clinician. */
  note?: string;
  /** The `updatedAt` the patient saw, so core can reject a stale cancel. */
  expectedUpdatedAt: string;
}

/** What the backend actually did, returned on the cancelled appointment. */
export interface CancellationRecord {
  cancelledAt: string;
  cancellationReason: CancellationReason;
  note?: string | null;
  /** True when the cancellation arrived after the policy cutoff. */
  late: boolean;
  /** True when the slot was returned to the doctor's pool. */
  slotReleased: boolean;
}

/** The cancelled row: the real appointment shape plus the cancellation record. */
export type CancelledAppointment = PatientAppointment & { cancellation?: CancellationRecord | null };
