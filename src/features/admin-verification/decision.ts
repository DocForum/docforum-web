import type { VerificationDecisionInput, VerificationStatus } from '../../types/models';

export const REASON_MIN_LENGTH = 10;
export const REASON_MAX_LENGTH = 500;

/** Collapse runs of whitespace and trim — so a paste of paragraphs can't blow
 * past the audit trail's length budget with invisible characters. */
export function normaliseReason(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/** Returns an error message, or null when the reason is acceptable. Both
 * approve and reject require one: the reason is what the audit trail keeps
 * after the decision. */
export function validateReason(value: string): string | null {
  const reason = normaliseReason(value);
  if (reason.length < REASON_MIN_LENGTH) {
    return `Give a reason of at least ${REASON_MIN_LENGTH} characters — it is saved to the audit trail.`;
  }
  if (reason.length > REASON_MAX_LENGTH) {
    return `Keep the reason to ${REASON_MAX_LENGTH} characters or fewer.`;
  }
  return null;
}

export type DecisionStatus = VerificationDecisionInput['status'];

export function decisionLabel(status: DecisionStatus): string {
  return status === 'verified' ? 'Approve' : 'Reject';
}

/** What the decision does, in PRD terms — shown before the admin confirms. */
export function decisionConsequence(status: DecisionStatus): string {
  if (status === 'verified') {
    return 'Approving makes this doctor visible in patient search and bookable for consultations.';
  }
  return 'Rejecting keeps this doctor out of patient search. They can be approved later once the concern is addressed.';
}

/** The decision after a no-op server answer: `PATCH` with the status the
 * profile already has returns the profile unchanged (docforum-core records
 * nothing), so a duplicate decision is not history. */
export function statusAfterDecision(
  current: VerificationStatus,
  next: DecisionStatus,
): VerificationStatus {
  return current === next ? current : next;
}
