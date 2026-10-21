// Reasons land in docforum-core's audit trail next to the admin's id, and a
// rejection is also shown to the doctor as what to fix or resubmit (PRD
// §8.1.5 — a rejected claim has to be actionable, or the doctor just tries
// the same specialty again).
export const REASON_MIN_LENGTH = 10;
export const REASON_MAX_LENGTH = 500;

/** Collapses runs of whitespace (including pasted newlines) to one space. */
export function normaliseReason(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}

/**
 * Rejections always need a reason — the doctor is told what to resubmit.
 * Approvals may carry an optional note, so only the length cap applies there.
 */
export function validateReason(raw: string, required: boolean): string | null {
  const reason = normaliseReason(raw);
  if (!reason) {
    return required
      ? 'Give a reason — the doctor is told what to fix or resubmit.'
      : null;
  }
  if (reason.length < REASON_MIN_LENGTH) return `Write at least ${REASON_MIN_LENGTH} characters.`;
  if (reason.length > REASON_MAX_LENGTH) return `Keep it under ${REASON_MAX_LENGTH} characters.`;
  return null;
}
