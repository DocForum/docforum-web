// Time-zone-correct formatting for every displayed date and time (issue
// #110). All helpers require an explicit IANA zone — there is deliberately
// no "use the browser default" overload, because an accidental implicit
// zone is exactly the bug this module exists to prevent. All arithmetic is
// delegated to Intl; no manual UTC-offset maths anywhere.
export const TIME_ZONE_STORAGE_KEY = 'docforum-time-zone';

export const FALLBACK_TIME_ZONE = 'UTC';

/** Zones offered in pickers. `Intl.supportedValuesOf` is the source of
 * truth where available; the fallback keeps older engines usable. */
const FALLBACK_ZONES = [
  'UTC',
  'Europe/London',
  'Europe/Dublin',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Lisbon',
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Africa/Lagos',
  'Africa/Nairobi',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Vancouver',
  'America/Mexico_City',
  'America/Sao_Paulo',
  'America/Argentina/Buenos_Aires',
  'Asia/Dubai',
  'Asia/Karachi',
  'Asia/Kolkata',
  'Asia/Dhaka',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Hong_Kong',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Perth',
  'Pacific/Auckland',
];

export function getBrowserTimeZone(): string {
  try {
    const zone = new Intl.DateTimeFormat().resolvedOptions().timeZone;
    return zone && isValidTimeZone(zone) ? zone : FALLBACK_TIME_ZONE;
  } catch {
    return FALLBACK_TIME_ZONE;
  }
}

export function isValidTimeZone(zone: string | null | undefined): zone is string {
  if (!zone) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/** IANA zones, sorted, always including UTC and the browser zone. */
export function listTimeZones(): string[] {
  let zones: string[];
  try {
    const supported = (
      Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
    ).supportedValuesOf?.('timeZone');
    zones = supported?.length ? supported : FALLBACK_ZONES;
  } catch {
    zones = FALLBACK_ZONES;
  }

  const unique = new Set([...zones, FALLBACK_TIME_ZONE, getBrowserTimeZone()]);
  return [...unique].sort((a, b) => a.localeCompare(b));
}

/** Stored preference if valid, otherwise the browser zone. */
export function readStoredTimeZone(): string {
  if (typeof window === 'undefined') return FALLBACK_TIME_ZONE;
  try {
    const stored = window.localStorage.getItem(TIME_ZONE_STORAGE_KEY);
    if (stored && isValidTimeZone(stored)) return stored;
  } catch {
    // Storage can be unavailable (private mode / blocked cookies); the
    // browser zone is still a correct, deliberate fallback.
  }
  return getBrowserTimeZone();
}

export function storeTimeZone(zone: string): void {
  if (!isValidTimeZone(zone) || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(TIME_ZONE_STORAGE_KEY, zone);
  } catch {
    // Preference is session-only if storage is unavailable.
  }
}

export type DateInput = string | number | Date;

function toDate(value: DateInput | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Formats an instant in `timeZone`. Throws on an invalid zone — a typo must
 * surface in development rather than silently rendering in the wrong zone.
 */
export function formatDateTime(
  value: DateInput | null | undefined,
  timeZone: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' },
  locale?: string,
): string {
  const date = toDate(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat(locale, { ...options, timeZone }).format(date);
}

export function formatDate(
  value: DateInput | null | undefined,
  timeZone: string,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' },
  locale?: string,
): string {
  return formatDateTime(value, timeZone, options, locale);
}

export function formatTime(
  value: DateInput | null | undefined,
  timeZone: string,
  options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' },
  locale?: string,
): string {
  return formatDateTime(value, timeZone, options, locale);
}

/** Human label for a zone at a given instant, e.g. "GMT+1" or "EDT". */
export function formatZoneName(
  timeZone: string,
  at: DateInput = new Date(),
  locale?: string,
): string {
  const date = toDate(at) ?? new Date();
  const parts = new Intl.DateTimeFormat(locale, {
    timeZone,
    timeZoneName: 'short',
  }).formatToParts(date);
  return parts.find((part) => part.type === 'timeZoneName')?.value ?? timeZone;
}

export function zonesDiffer(a: string, b: string): boolean {
  return a !== b;
}

export function dualZoneLabel(
  viewerZone: string,
  counterpartZone: string | null | undefined,
  counterpartLabel = "Doctor's time",
): string | null {
  if (!counterpartZone || !isValidTimeZone(counterpartZone) || !zonesDiffer(viewerZone, counterpartZone)) {
    return null;
  }
  return counterpartLabel;
}

/** Formats a time input value (HH:MM) — used for quiet-hours fields, where
 * the value is a wall-clock time without a date. */
export function formatClockLabel(time: string): string {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!match) return time;
  const [, hours, minutes] = match;
  const hour = Number(hours);
  const suffix = hour < 12 ? 'AM' : 'PM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minutes} ${suffix}`;
}
