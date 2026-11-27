import type { SentReferral } from '../../types/models';

/** A referral the cascade expired after repeated no-shows, where the
 * referring doctor was notified — the state this view exists to surface. */
export function isExpiredAndNotified(referral: SentReferral): boolean {
  return referral.status === 'expired' && Boolean(referral.referringDoctorNotifiedAt);
}

/** The three states that ask something of the referring doctor. */
export function needsAttention(referral: SentReferral): boolean {
  return Boolean(referral.loopFlaggedAt) || isExpiredAndNotified(referral) || referral.status === 'pending';
}

function createdAtMs(referral: SentReferral): number {
  const parsed = Date.parse(referral.createdAt);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Newest referrals needing attention first; settled ones follow, newest
 * first. Core returns the array newest-first, but the endpoint documents no
 * order guarantee, so the view promises this order itself.
 */
export function sortSentReferrals(referrals: SentReferral[]): SentReferral[] {
  return [...referrals].sort((a, b) => {
    const attentionDelta = Number(needsAttention(b)) - Number(needsAttention(a));
    if (attentionDelta !== 0) return attentionDelta;
    return createdAtMs(b) - createdAtMs(a);
  });
}

/** Referring doctors see raw ids when core doesn't expand the target; a
 * short prefix keeps the row honest without turning it into a UUID wall. */
export function shortId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}
