/** Display-only formatting for the verification console. Kept local to this
 * feature so features never reach into each other for helpers. */
import { englishTranslator } from '../../i18n/englishTranslator';
import type { Translator } from '../../i18n/useT';
import { formatInstant } from '../../i18n/format';

export function formatBytes(sizeBytes: number, t: Translator = englishTranslator): string {
  if (!Number.isFinite(sizeBytes) || sizeBytes < 0) {
    return t('adminVerification.bytes.unknown', 'unknown size');
  }
  if (sizeBytes < 1024) return t('adminVerification.bytes.bytes', '{size} B', { size: sizeBytes });
  if (sizeBytes < 1024 * 1024) {
    return t('adminVerification.bytes.kilobytes', '{size} KB', { size: (sizeBytes / 1024).toFixed(0) });
  }
  return t('adminVerification.bytes.megabytes', '{size} MB', { size: (sizeBytes / (1024 * 1024)).toFixed(1) });
}

export function formatDateTime(iso: string, locale?: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return formatInstant(date, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }, locale);
}

export function formatDate(iso: string, locale?: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return formatInstant(date, { day: 'numeric', month: 'short', year: 'numeric' }, locale);
}

/** How long a signed URL has left, in plain words. */
export function expiryLabel(expiresAt: string, t: Translator = englishTranslator): string {
  const expiry = Date.parse(expiresAt);
  if (Number.isNaN(expiry)) return t('adminVerification.expiry.soon', 'expires soon');
  const remainingMs = expiry - Date.now();
  if (remainingMs <= 0) return t('adminVerification.expiry.expired', 'expired just now');
  const minutes = Math.max(1, Math.ceil(remainingMs / 60_000));
  return t(
    'adminVerification.expiry.minutes',
    'expires in about {minutes, plural, one {# minute} other {# minutes}}',
    { minutes },
  );
}

/** `GABC…XYZ` — a short actor reference for the history rows. Audit events
 * carry ids, not emails, so that is all the trail can honestly show. */
export function shortActor(actorUserId: string | null, t: Translator = englishTranslator): string {
  if (!actorUserId) return t('adminVerification.actor.system', 'system');
  const short = actorUserId.length > 8 ? `${actorUserId.slice(0, 8)}…` : actorUserId;
  return t('adminVerification.actor.admin', 'admin {id}', { id: short });
}
