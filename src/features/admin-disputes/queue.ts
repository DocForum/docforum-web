import { formatStroops } from '../../services/payments-service';
import type {
  DisputeResolution,
  DisputeStatus,
  FulfillmentDisputeSummary,
} from '../../types/models';

const HOUR_MS = 60 * 60 * 1000;

/** Whole hours since `since`, or null for an unparseable timestamp. */
export function hoursSince(since: string, now: number): number | null {
  const start = Date.parse(since);
  if (Number.isNaN(start)) return null;
  return Math.max(0, Math.floor((now - start) / HOUR_MS));
}

export function formatAge(hours: number): string {
  if (hours < 1) return 'under 1 h';
  if (hours < 48) return `${hours} h`;
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  // Past a week the extra hours are noise.
  return days < 7 && rest > 0 ? `${days} d ${rest} h` : `${days} days`;
}

export type AgeTone = 'elevated' | 'high' | 'critical';

/** Disputes hold money in escrow, so the urgency starts earlier than the
 * referral queue's thresholds: a day is already worth chasing. */
export function ageTone(hours: number): AgeTone {
  if (hours >= 72) return 'critical';
  if (hours >= 24) return 'high';
  return 'elevated';
}

/** Oldest first — the backend promises this, but the queue also sorts every
 * page loaded so far. */
export function sortByAge<T extends Pick<FulfillmentDisputeSummary, 'openedAt'>>(disputes: T[]): T[] {
  return [...disputes].sort((a, b) => Date.parse(a.openedAt) - Date.parse(b.openedAt));
}

export const STATUS_LABELS: Record<DisputeStatus, string> = {
  open: 'Open',
  resolved_facility: 'Resolved for facility',
  resolved_patient: 'Resolved for patient',
};

export const RESOLUTION_LABELS: Record<DisputeResolution, string> = {
  facility: 'Resolved for facility',
  patient: 'Resolved for patient',
};

export interface PaymentConsequence {
  /** One line naming the money movement. */
  headline: string;
  /** Plain-language explanation of what docforum-core will do. */
  detail: string;
  /** Short form for success notices. */
  summary: string;
  recipient: string;
  verb: 'released' | 'refunded';
}

/**
 * What each final action does to the escrowed money. Shown before the admin
 * confirms, so the choice is never "just a label".
 */
export function paymentConsequence(
  dispute: Pick<
    FulfillmentDisputeSummary,
    'amountStroops' | 'asset' | 'facilityName' | 'patientName'
  >,
  resolution: DisputeResolution,
): PaymentConsequence {
  const amount = formatStroops(dispute.amountStroops, dispute.asset);
  if (resolution === 'facility') {
    return {
      headline: `Release ${amount} to ${dispute.facilityName}`,
      detail:
        'docforum-core releases the escrowed payment to the facility. The patient is not refunded, ' +
        'and this cannot be reversed.',
      summary: `${amount} released to ${dispute.facilityName}`,
      recipient: dispute.facilityName,
      verb: 'released',
    };
  }
  return {
    headline: `Refund ${amount} to ${dispute.patientName}`,
    detail:
      'docforum-core refunds the escrowed payment to the patient. The facility is not paid, ' +
      'and this cannot be reversed.',
    summary: `${amount} refunded to ${dispute.patientName}`,
    recipient: dispute.patientName,
    verb: 'refunded',
  };
}

export const NOTE_MIN = 10;
export const NOTE_MAX = 1000;

export function normaliseNote(note: string): string {
  return note.trim().replace(/\s+/g, ' ');
}

export function validateNote(note: string): string | null {
  const value = normaliseNote(note);
  if (value.length < NOTE_MIN) return `Write at least ${NOTE_MIN} characters.`;
  if (value.length > NOTE_MAX) return `Keep the note under ${NOTE_MAX} characters.`;
  return null;
}

/** Attachment sizes for humans; evidence files are small, so no GB case. */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
