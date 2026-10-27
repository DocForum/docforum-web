import type { PayoutAsset } from '../../types/models';
import { formatStroops } from '../../services/payments-service';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Coarse age for queue badges: "6 d 4 h", "3 h 12 m", "8 m". */
export function ageLabel(iso: string, now: number = Date.now()): string {
  const opened = Date.parse(iso);
  if (Number.isNaN(opened)) return 'unknown age';
  const elapsed = Math.max(0, now - opened);

  if (elapsed >= DAY) {
    const days = Math.floor(elapsed / DAY);
    const hours = Math.floor((elapsed % DAY) / HOUR);
    return hours > 0 ? `${days} d ${hours} h` : `${days} d`;
  }
  if (elapsed >= HOUR) {
    const hours = Math.floor(elapsed / HOUR);
    const minutes = Math.floor((elapsed % HOUR) / MINUTE);
    return minutes > 0 ? `${hours} h ${minutes} m` : `${hours} h`;
  }
  return `${Math.max(0, Math.floor(elapsed / MINUTE))} m`;
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

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return 'unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** "in 4 min" / "expired" for a freshly minted attachment link. */
export function expiryLabel(iso: string, now: number = Date.now()): string {
  const expires = Date.parse(iso);
  if (Number.isNaN(expires)) return 'expiry unknown';
  const remaining = expires - now;
  if (remaining <= 0) return 'expired';
  if (remaining < MINUTE) return 'expires in under a minute';
  return `expires in ${Math.floor(remaining / MINUTE)} min`;
}

export function attachmentKindLabel(kind: string): string {
  const labels: Record<string, string> = {
    dispensing_record: 'Dispensing record',
    specimen_id: 'Specimen ID',
    photo: 'Photo',
    other: 'Other',
  };
  return labels[kind] ?? kind;
}
