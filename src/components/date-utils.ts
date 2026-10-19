// Calendar dates are plain `YYYY-MM-DD` strings — never JS Date instants —
// so a date never shifts when the browser or the configured zone differs.
// `timeZone` only decides what "today" is.

export const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_PATTERN = /^([01]?\d|2[0-3]):([0-5]\d)$/;

export function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function isoDateFromParts(year: number, month: number, day: number): string {
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day
    .toString()
    .padStart(2, '0')}`;
}

export function dateParts(value: string): { year: number; month: number; day: number } {
  const [year, month, day] = value.split('-').map(Number);
  return { year, month, day };
}

export function addDays(value: string, amount: number): string {
  const { year, month, day } = dateParts(value);
  const date = new Date(Date.UTC(year, month - 1, day + amount));
  return isoDateFromParts(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function addMonths(value: string, amount: number): string {
  const { year, month, day } = dateParts(value);
  const target = new Date(Date.UTC(year, month - 1 + amount, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  return isoDateFromParts(
    target.getUTCFullYear(),
    target.getUTCMonth() + 1,
    Math.min(day, lastDay),
  );
}

/** Today's calendar date in an explicit IANA time zone. */
export function todayInTimeZone(timeZone: string, now = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
    const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
    return `${get('year')}-${get('month')}-${get('day')}`;
  } catch {
    // Invalid zone in older runtimes: fall back to the local calendar day.
    return isoDateFromParts(now.getFullYear(), now.getMonth() + 1, now.getDate());
  }
}

function numericDateOrder(locale: string): ('year' | 'month' | 'day')[] {
  const parts = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(new Date(2001, 10, 22));
  return parts
    .filter((part) => part.type === 'year' || part.type === 'month' || part.type === 'day')
    .map((part) => part.type as 'year' | 'month' | 'day');
}

/**
 * Parse typed manual entry. ISO (`2026-10-19`) always works; otherwise the
 * locale's numeric order is used (`10/19/2026` for en-US, `19.10.2026` for
 * de-DE). Month names are intentionally not guessed.
 */
export function parseDateInput(text: string, locale: string): string | null {
  const value = text.trim();
  if (!value) return '';
  if (ISO_DATE_PATTERN.test(value)) return isValidIsoDate(value) ? value : null;

  const numbers = value.split(/[^\d]+/).filter(Boolean).map(Number);
  if (numbers.length !== 3 || numbers.some((number) => !Number.isFinite(number))) return null;

  const order = numericDateOrder(locale);
  const parts: Record<'year' | 'month' | 'day', number> = { year: 0, month: 0, day: 0 };
  order.forEach((key, index) => {
    parts[key] = numbers[index];
  });

  // Two-digit years are ambiguous; require four digits for the year.
  if (String(parts.year).length < 4) return null;
  const iso = isoDateFromParts(parts.year, parts.month, parts.day);
  return isValidIsoDate(iso) ? iso : null;
}

export function formatDateLabel(value: string, locale: string): string {
  if (!isValidIsoDate(value)) return '';
  const { year, month, day } = dateParts(value);
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

export function formatMonthLabel(value: string, locale: string): string {
  const { year, month } = dateParts(value);
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1, 12)));
}

export function weekdayLabels(locale: string, firstDay: number): { narrow: string; long: string }[] {
  return Array.from({ length: 7 }, (_, index) => {
    // 2023-01-01 was a Sunday; offset from it to each weekday.
    const date = new Date(Date.UTC(2023, 0, 1 + ((firstDay + index) % 7), 12));
    return {
      narrow: new Intl.DateTimeFormat(locale, { weekday: 'narrow', timeZone: 'UTC' }).format(date),
      long: new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }).format(date),
    };
  });
}

/** WAI-ARIA/CLDR first day of week (0 = Sunday), with a safe fallback. */
export function firstDayOfWeek(locale: string): number {
  try {
    const info = (new Intl.Locale(locale) as Intl.Locale & { weekInfo?: { firstDay: number } }).weekInfo;
    if (info?.firstDay) return info.firstDay % 7;
  } catch {
    // Intl.Locale unavailable — fall through.
  }
  return /^(en-US|en-CA|ja|ko|zh)/.test(locale) ? 0 : 1;
}

export function formatTypedDateExample(locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(2001, 10, 22, 12)));
}

export function parseTimeInput(text: string): string | null {
  const value = text.trim();
  if (!value) return '';
  const match = /^(\d{1,2}):(\d{2})\s*([ap]m)?$/i.exec(value);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toLowerCase();
  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    if (meridiem === 'pm' && hours !== 12) hours += 12;
    if (meridiem === 'am' && hours === 12) hours = 0;
  }
  if (hours > 23 || minutes > 59) return null;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

export function formatTimeLabel(value: string, locale: string): string {
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return '';
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(2001, 0, 1, hours, minutes, 12)));
}

export function minutesFromTime(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

export function timeFromMinutes(total: number): string {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}
