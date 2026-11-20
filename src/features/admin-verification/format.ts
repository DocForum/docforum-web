/** Display-only formatting for the verification console. Kept local to this
 * feature so features never reach into each other for helpers. */

export function formatBytes(sizeBytes: number): string {
  if (!Number.isFinite(sizeBytes) || sizeBytes < 0) return 'unknown size';
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(0)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

import { createFormatters } from '../../i18n/format';

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : createFormatters().formatDateTime(date);
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return Number.isNaN(date.getTime()) ? iso : createFormatters().formatDate(date);
}

/** How long a signed URL has left, in plain words. */
export function expiryLabel(expiresAt: string): string {
  const expiry = Date.parse(expiresAt);
  if (Number.isNaN(expiry)) return 'expires soon';
  const remainingMs = expiry - Date.now();
  if (remainingMs <= 0) return 'expired just now';
  const minutes = Math.max(1, Math.ceil(remainingMs / 60_000));
  return `expires in about ${minutes} minute${minutes === 1 ? '' : 's'}`;
}

/** `GABC…XYZ` — a short actor reference for the history rows. Audit events
 * carry ids, not emails, so that is all the trail can honestly show. */
export function shortActor(actorUserId: string | null): string {
  if (!actorUserId) return 'system';
  const short = actorUserId.length > 8 ? `${actorUserId.slice(0, 8)}…` : actorUserId;
  return `admin ${short}`;
}
