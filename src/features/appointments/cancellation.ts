// Appointment cancellation policy logic (issue #15) — pure, clock-injected and
// fetch-free so every before/after-cutoff boundary is a case a test can pin
// down. The policy values come from docforum-core (assumed core#56); this
// module only turns them into the sentence the confirmation dialog shows.
//
// Nothing here decides *whether* a late cancellation is allowed: the issue
// asks for cancelling to stay easy after the cutoff and be explained, so a
// late cancel is still allowed — it is just labelled and described honestly.
import type {
  CancellationPolicy,
  CancellationReason,
  PatientAppointment,
} from '../../types/models';

export interface CancellationOutcome {
  /** False only when cancelling is pointless (settled visit, start passed). */
  allowed: boolean;
  /** Why cancelling is not allowed — non-null exactly when `allowed` is false. */
  blockedReason: string | null;
  /** True when `now` is at or inside the policy cutoff. */
  late: boolean;
  /** What happens to the slot under the policy, at this moment. */
  slotReleased: boolean;
  /** The consequence, in plain language, shown before confirming. */
  policyStatement: string;
  /** Referral consequence, for referral-origin visits; null otherwise. */
  referralStatement: string | null;
  /** ISO instant the cutoff passes (start − cutoff), when the time is known. */
  cutoffAt: string | null;
}

const STATUS_REASON: Record<PatientAppointment['status'], string> = {
  scheduled: '',
  checked_in: 'You have already checked in, so this appointment can no longer be cancelled here.',
  in_progress: 'This appointment is in progress, so it can no longer be cancelled here.',
  completed: 'This appointment is already complete, so there is nothing to cancel.',
  cancelled: 'This appointment is already cancelled.',
  no_show: 'This appointment was recorded as a no-show, so there is nothing to cancel.',
};

/** "2 hours" / "30 minutes" / "1 hour 30 minutes". Deliberately not
 * locale-formatted: it is embedded in English UI copy. */
export function formatCutoff(minutes: number): string {
  if (minutes <= 0) return 'the start of the appointment';
  if (minutes < 60) return minutes === 1 ? '1 minute' : `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const hourPart = hours === 1 ? '1 hour' : `${hours} hours`;
  return rest === 0 ? hourPart : `${hourPart} ${rest} ${rest === 1 ? 'minute' : 'minutes'}`;
}

export const CANCELLATION_REASONS: { value: CancellationReason; label: string }[] = [
  { value: 'schedule_conflict', label: 'Something else came up' },
  { value: 'feeling_better', label: "I'm feeling better" },
  { value: 'transport', label: "I can't get there" },
  { value: 'found_other_care', label: 'I found care elsewhere' },
  { value: 'other', label: 'Another reason' },
];

export const CANCELLATION_REASON_LABEL: Record<CancellationReason, string> = {
  schedule_conflict: 'Something else came up',
  feeling_better: "I'm feeling better",
  transport: "I can't get there",
  found_other_care: 'I found care elsewhere',
  other: 'Another reason',
};

const REFERRAL_COPY: Record<CancellationPolicy['referralHandling'], string> = {
  returns_to_referral_queue:
    'This visit came from a referral. Cancelling sends it back to the referral queue so your clinician can offer it to another doctor — the referral itself is not lost.',
  referral_unaffected:
    'This visit came from a referral. The referral stays with your clinician; only this appointment is cancelled.',
  referral_closed:
    'This visit came from a referral. Cancelling this appointment also closes that referral, so a new referral would be needed.',
};

export function cancellationOutcome(
  appointment: PatientAppointment,
  policy: CancellationPolicy,
  now: Date,
): CancellationOutcome {
  const cutoffMinutes = policy.lateCancellationCutoffMinutes;
  const startMs = Date.parse(appointment.availabilitySlot.startTime);

  if (appointment.status !== 'scheduled') {
    return {
      allowed: false,
      blockedReason: STATUS_REASON[appointment.status],
      late: false,
      slotReleased: false,
      policyStatement: '',
      referralStatement: null,
      cutoffAt: null,
    };
  }

  if (Number.isNaN(startMs)) {
    // Fail closed: an unreadable time must not be used to promise that a slot
    // will be released.
    return {
      allowed: false,
      blockedReason: "This appointment's time can't be read right now, so it can't be cancelled here. Please contact your clinician.",
      late: false,
      slotReleased: false,
      policyStatement: '',
      referralStatement: null,
      cutoffAt: null,
    };
  }

  const cutoffMs = startMs - cutoffMinutes * 60_000;
  const cutoffAt = new Date(cutoffMs).toISOString();

  if (now.getTime() >= startMs) {
    return {
      allowed: false,
      blockedReason:
        'This appointment was due to start already. Call the clinic so they can record what happened.',
      late: true,
      slotReleased: false,
      policyStatement: '',
      referralStatement: null,
      cutoffAt,
    };
  }

  const late = now.getTime() >= cutoffMs;
  const slotReleased = late ? policy.releaseSlotAfterCutoff : policy.releaseSlotBeforeCutoff;
  const cutoffLabel = formatCutoff(cutoffMinutes);

  const slotSentence = slotReleased
    ? 'the slot is released back to your clinician so someone else can use it'
    : 'the slot stays blocked, so it will not be offered to another patient';

  const policyStatement = late
    ? `This is inside the ${cutoffLabel} cutoff, so it is recorded as a late cancellation.${
        policy.recordLateCancellation
          ? " Your clinician can see that it was late so they can follow up on your care."
          : ''
      } ${capitalise(slotSentence)}.`
    : `This is more than ${cutoffLabel} before your appointment, so it is not a late cancellation. ${capitalise(
        slotSentence,
      )}.`;

  return {
    allowed: true,
    blockedReason: null,
    late,
    slotReleased,
    policyStatement,
    referralStatement:
      appointment.origin === 'referral' ? REFERRAL_COPY[policy.referralHandling] : null,
    cutoffAt,
  };
}

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
