import { englishTranslator } from '../../i18n/englishTranslator';
import type { Translator } from '../../i18n/useT';

// Reasons land in docforum-core's audit trail next to the admin's id, so
// they need to say something ("x" doesn't), but stay a sentence or two.
export const REASON_MIN_LENGTH = 10;
export const REASON_MAX_LENGTH = 500;

/** Collapses runs of whitespace (including pasted newlines) to one space. */
export function normaliseReason(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}

export function validateReason(raw: string, t: Translator = englishTranslator): string | null {
  const reason = normaliseReason(raw);
  if (!reason) {
    return t('adminReferrals.reasonValidation.required', 'Give a reason — it is recorded in the audit trail.');
  }
  if (reason.length < REASON_MIN_LENGTH) {
    return t('adminReferrals.reasonValidation.tooShort', 'Write at least {min} characters.', {
      min: REASON_MIN_LENGTH,
    });
  }
  if (reason.length > REASON_MAX_LENGTH) {
    return t('adminReferrals.reasonValidation.tooLong', 'Keep it under {max} characters.', {
      max: REASON_MAX_LENGTH,
    });
  }
  return null;
}
