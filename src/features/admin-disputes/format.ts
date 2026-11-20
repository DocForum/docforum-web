import type { PayoutAsset } from '../../types/models';
import { formatStroops } from '../../services/payments-service';
import type { Translator } from '../../i18n/useT';
import { englishTranslator } from '../../i18n/englishTranslator';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Coarse age for queue badges: "6 d 4 h", "3 h 12 m", "8 m". */
export function ageLabel(iso: string, now: number = Date.now(), t: Translator = englishTranslator): string {
  const opened = Date.parse(iso);
  if (Number.isNaN(opened)) return t('adminDisputes.age.unknown', 'unknown age');
  const elapsed = Math.max(0, now - opened);

  if (elapsed >= DAY) {
    const days = Math.floor(elapsed / DAY);
    const hours = Math.floor((elapsed % DAY) / HOUR);
    return hours > 0
      ? t('adminDisputes.age.daysHours', '{days} d {hours} h', { days, hours })
      : t('adminDisputes.age.days', '{days} d', { days });
  }
  if (elapsed >= HOUR) {
    const hours = Math.floor(elapsed / HOUR);
    const minutes = Math.floor((elapsed % HOUR) / MINUTE);
    return minutes > 0
      ? t('adminDisputes.age.hoursMinutes', '{hours} h {minutes} min', { hours, minutes })
      : t('adminDisputes.age.hours', '{hours} h', { hours });
  }
  return t('adminDisputes.age.minutes', '{minutes} min', { minutes: Math.max(0, Math.floor(elapsed / MINUTE)) });
}

/** Exact timestamp for reports and timelines; the age badge carries urgency. */
export function formatDateTime(iso: string): string {
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return iso;
  // Local time, like the audit trail — an unlabelled UTC timestamp would be
  // read as the admin's own clock.
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(value);
}

/** Escrow amounts arrive as stroop strings; XLM or USDC is chosen by the order. */
export function formatDisputeAmount(stroops: string, asset: PayoutAsset): string {
  return formatStroops(stroops, asset);
}

export function formatBytes(bytes: number, t: Translator = englishTranslator): string {
  if (!Number.isFinite(bytes) || bytes < 0) return t('adminDisputes.attachment.unknownSize', 'unknown size');
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** "in 4 min" / "expired" for a freshly minted attachment link. */
export function expiryLabel(iso: string, now: number = Date.now(), t: Translator = englishTranslator): string {
  const expires = Date.parse(iso);
  if (Number.isNaN(expires)) return t('adminDisputes.attachment.expiryUnknown', 'expiry unknown');
  const remaining = expires - now;
  if (remaining <= 0) return t('adminDisputes.attachment.expired', 'expired');
  if (remaining < MINUTE) return t('adminDisputes.attachment.expiresUnderMinute', 'expires in under a minute');
  return t('adminDisputes.attachment.expiresIn', 'expires in {minutes} min', { minutes: Math.floor(remaining / MINUTE) });
}

export function attachmentKindLabel(kind: string, t: Translator = englishTranslator): string {
  const labels: Record<string, string> = {
    dispensing_record: t('adminDisputes.attachment.kind.dispensingRecord', 'Dispensing record'),
    specimen_id: t('adminDisputes.attachment.kind.specimenId', 'Specimen ID'),
    photo: t('adminDisputes.attachment.kind.photo', 'Photo'),
    other: t('adminDisputes.attachment.kind.other', 'Other'),
  };
  return labels[kind] ?? kind;
}
