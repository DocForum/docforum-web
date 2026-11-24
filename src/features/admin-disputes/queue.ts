import type { DisputeReason, FulfillmentDisputeSummary } from '../../types/models';
import type { Translator } from '../../i18n/useT';
import { ageLabel } from './format';
import { englishTranslator } from '../../i18n/englishTranslator';

export function reasonLabel(reason: DisputeReason, t: Translator = englishTranslator): string {
  const labels: Record<DisputeReason, string> = {
    not_received: t('adminDisputes.reason.notReceived', 'Not received'),
    wrong_item: t('adminDisputes.reason.wrongItem', 'Wrong item'),
    incomplete: t('adminDisputes.reason.incomplete', 'Incomplete order'),
    damaged: t('adminDisputes.reason.damaged', 'Damaged'),
    other: t('adminDisputes.reason.other', 'Other'),
  };
  return labels[reason] ?? reason;
}

const HOUR_MS = 60 * 60 * 1000;

/** Whole hours since `since`, or null for an unparseable timestamp. */
export function hoursSince(since: string, now: number): number | null {
  const start = Date.parse(since);
  if (Number.isNaN(start)) return null;
  return Math.max(0, Math.floor((now - start) / HOUR_MS));
}

export type AgeTone = 'elevated' | 'high' | 'critical';

/** Money is stuck while a dispute is open, so the thresholds are tighter
 * than the referral queue's. */
export function ageTone(hours: number): AgeTone {
  if (hours >= 72) return 'critical';
  if (hours >= 24) return 'high';
  return 'elevated';
}

/** Oldest first — the queue's whole point is which escrow has been blocked
 * longest. The server should send them sorted, but the console promises
 * "by age" across every page loaded so far. */
export function sortByAge<T extends Pick<FulfillmentDisputeSummary, 'openedAt'>>(disputes: T[]): T[] {
  return [...disputes].sort((a, b) => Date.parse(a.openedAt) - Date.parse(b.openedAt));
}

export function oldestAgeLabel(disputes: FulfillmentDisputeSummary[], now: number, t?: Translator): string | null {
  if (disputes.length === 0) return null;
  const oldest = sortByAge(disputes)[0];
  return hoursSince(oldest.openedAt, now) === null ? null : ageLabel(oldest.openedAt, now, t);
}
