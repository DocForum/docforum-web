import { englishTranslator } from '../../i18n/englishTranslator';
import type { Translator } from '../../i18n/useT';
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
export function validateReason(value: string, t: Translator = englishTranslator): string | null {
  const reason = normaliseReason(value);
  if (reason.length < REASON_MIN_LENGTH) {
    return t(
      'adminVerification.decision.reasonTooShort',
      'Give a reason of at least {min} characters — it is saved to the audit trail.',
      { min: REASON_MIN_LENGTH },
    );
  }
  if (reason.length > REASON_MAX_LENGTH) {
    return t('adminVerification.decision.reasonTooLong', 'Keep the reason to {max} characters or fewer.', {
      max: REASON_MAX_LENGTH,
    });
  }
  return null;
}

export type DecisionStatus = VerificationDecisionInput['status'];

export function decisionLabel(status: DecisionStatus, t: Translator = englishTranslator): string {
  return status === 'verified'
    ? t('adminVerification.decision.approve', 'Approve')
    : t('adminVerification.decision.reject', 'Reject');
}

/** What the decision does, in PRD terms — shown before the admin confirms. */
export function decisionConsequence(status: DecisionStatus, t: Translator = englishTranslator): string {
  if (status === 'verified') {
    return t(
      'adminVerification.decision.approveConsequence',
      'Approving makes this doctor visible in patient search and bookable for consultations.',
    );
  }
  return t(
    'adminVerification.decision.rejectConsequence',
    'Rejecting keeps this doctor out of patient search. They can be approved later once the concern is addressed.',
  );
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
