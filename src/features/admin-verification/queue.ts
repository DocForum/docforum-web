import type { VerificationDecision, VerificationQueueItem, VerificationStatus } from '../../types/models';

const HOUR_MS = 60 * 60 * 1000;

/** Whole hours since `since`, or null for an unparseable timestamp. */
export function hoursSince(since: string, now: number): number | null {
  const start = Date.parse(since);
  if (Number.isNaN(start)) return null;
  return Math.max(0, Math.floor((now - start) / HOUR_MS));
}

export type AgeTone = 'fresh' | 'elevated' | 'critical';

/**
 * Verification gates supply: an unverified doctor is invisible to search, so
 * every hour in the queue is an hour of a doctor not taking patients. Three
 * days waiting is worth flagging; a week is a failure.
 */
export function ageTone(hours: number): AgeTone {
  if (hours >= 168) return 'critical';
  if (hours >= 72) return 'elevated';
  return 'fresh';
}

/** Oldest first — the queue's whole point. The server is expected to sort,
 * but the console promises "oldest first" across every page loaded so far. */
export function sortBySubmitted<T extends Pick<VerificationQueueItem, 'submittedAt'>>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => {
    const left = Date.parse(a.submittedAt);
    const right = Date.parse(b.submittedAt);
    const leftOk = Number.isNaN(left) ? Number.POSITIVE_INFINITY : left;
    const rightOk = Number.isNaN(right) ? Number.POSITIVE_INFINITY : right;
    return leftOk - rightOk;
  });
}

export function statusLabel(status: VerificationStatus): string {
  if (status === 'verified') return 'Verified';
  if (status === 'rejected') return 'Rejected';
  return 'Pending review';
}

/** Age of the oldest waiting application, as a badge over the whole queue. */
export function oldestAgeLabel(items: VerificationQueueItem[], now: number = Date.now()): string | null {
  if (items.length === 0) return null;
  const oldest = sortBySubmitted(items)[0];
  const hours = hoursSince(oldest.submittedAt, now);
  if (hours === null) return null;
  if (hours >= 48) return `${Math.floor(hours / 24)} days waiting`;
  if (hours >= 1) return `${hours}h waiting`;
  return 'Waiting less than an hour';
}

/** Project a `doctor.verification_status_changed` audit event into the
 * decision history row the detail page renders. Returns null for events that
 * aren't verification decisions (the entity also records other state changes). */
export function toDecision(event: {
  id: string;
  action: string;
  fromState: string | null;
  toState: string | null;
  actorUserId: string | null;
  createdAt: string;
}): VerificationDecision | null {
  if (event.action !== 'doctor.verification_status_changed') return null;
  const from = event.fromState;
  const to = event.toState;
  const isStatus = (value: string | null): value is VerificationStatus =>
    value === 'pending' || value === 'verified' || value === 'rejected';
  if (!isStatus(to)) return null;
  return {
    id: event.id,
    at: event.createdAt,
    from: isStatus(from) ? from : null,
    to,
    actorUserId: event.actorUserId,
  };
}
