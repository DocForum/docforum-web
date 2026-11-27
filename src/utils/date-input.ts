// Pure date/time helpers behind DatePicker and TimePicker (issue #114).
//
// Values are plain strings, exactly what the native inputs they replace
// produced, so forms and services keep working unchanged:
//   - a date is ISO `YYYY-MM-DD` (a calendar day, no time, no zone);
//   - a time is 24-hour `HH:mm` wall-clock time.
// All arithmetic is done in UTC on calendar days, so a user's own zone or a
// DST change can never shift a picked day by one.

export interface CalendarDate {
  year: number;
  month: number; // 1–12
  day: number;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  return [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

function isRealDate({ year, month, day }: CalendarDate): boolean {
  return (
    Number.isInteger(year) &&
    year >= 1000 &&
    year <= 9999 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth(year, month)
  );
}

export function parseIsoDate(value: string): CalendarDate | null {
  const match = ISO_DATE.exec(value);
  if (!match) return null;
  const date = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  return isRealDate(date) ? date : null;
}

const pad = (value: number, length = 2) => String(value).padStart(length, '0');

// Intl.DateTimeFormat construction is expensive; pickers format dozens of
// cells/options per render, so formatters are cached per locale + options.
const formatterCache = new Map<string, Intl.DateTimeFormat>();
function formatter(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let cached = formatterCache.get(key);
  if (!cached) {
    cached = new Intl.DateTimeFormat(locale, options);
    formatterCache.set(key, cached);
  }
  return cached;
}

export function toIsoDate({ year, month, day }: CalendarDate): string {
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

function toUtc(iso: string): Date {
  const date = parseIsoDate(iso);
  if (!date) throw new Error(`Invalid ISO date: ${iso}`);
  return new Date(Date.UTC(date.year, date.month - 1, date.day));
}

function fromUtc(date: Date): string {
  return toIsoDate({ year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() });
}

export function addDays(iso: string, days: number): string {
  const date = toUtc(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return fromUtc(date);
}

/** Moves by whole months, clamping the day (31 Jan + 1 month → 28/29 Feb). */
export function addMonths(iso: string, months: number): string {
  const { year, month, day } = parseIsoDate(iso)!;
  const index = year * 12 + (month - 1) + months;
  const nextYear = Math.floor(index / 12);
  const nextMonth = (index % 12) + 1;
  return toIsoDate({ year: nextYear, month: nextMonth, day: Math.min(day, daysInMonth(nextYear, nextMonth)) });
}

/** 0 = Sunday … 6 = Saturday. */
export function dayOfWeek(iso: string): number {
  return toUtc(iso).getUTCDay();
}

export function startOfWeek(iso: string, weekStart: number): string {
  return addDays(iso, -((dayOfWeek(iso) - weekStart + 7) % 7));
}

export function endOfWeek(iso: string, weekStart: number): string {
  return addDays(startOfWeek(iso, weekStart), 6);
}

export function clampDate(iso: string, min?: string, max?: string): string {
  if (min && iso < min) return min;
  if (max && iso > max) return max;
  return iso;
}

/**
 * The month as weeks of ISO dates, `null` for the padding cells before the
 * 1st and after the last day, starting on `weekStart`.
 */
export function monthGrid(year: number, month: number, weekStart: number): (string | null)[][] {
  const first = toIsoDate({ year, month, day: 1 });
  const leading = (dayOfWeek(first) - weekStart + 7) % 7;
  const cells: (string | null)[] = Array.from({ length: leading }, () => null);
  for (let day = 1; day <= daysInMonth(year, month); day += 1) cells.push(toIsoDate({ year, month, day }));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** First day of the week for a locale (0 = Sunday). Uses `Intl.Locale`
 * week info where the browser has it; otherwise Sunday for the locales
 * that conventionally start on Sunday, Monday elsewhere (ISO 8601). */
export function weekStartFor(locale: string): number {
  try {
    const intlLocale = new Intl.Locale(locale) as Intl.Locale & {
      getWeekInfo?: () => { firstDay: number };
      weekInfo?: { firstDay: number };
    };
    const info = intlLocale.getWeekInfo?.() ?? intlLocale.weekInfo;
    if (info?.firstDay) return info.firstDay % 7;
  } catch {
    // Fall through to the table below.
  }
  const region = locale.split('-')[1]?.toUpperCase();
  const sundayRegions = ['US', 'CA', 'MX', 'BR', 'JP', 'IL', 'PH', 'KR', 'TW', 'HK', 'IN', 'ZA', 'AU'];
  if (region) return sundayRegions.includes(region) ? 0 : 1;
  return locale.toLowerCase().startsWith('en') ? 0 : 1;
}

/** The order day/month/year appear in for a locale's numeric dates. */
export function dateFieldOrder(locale: string): Array<'day' | 'month' | 'year'> {
  const parts = formatter(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'UTC',
  }).formatToParts(new Date(Date.UTC(2026, 10, 25)));
  const order = parts
    .map((part) => part.type)
    .filter((type): type is 'day' | 'month' | 'year' => type === 'day' || type === 'month' || type === 'year');
  return order.length === 3 ? order : ['year', 'month', 'day'];
}

/** Numeric display, e.g. `11/25/2026` (en-US), `25/11/2026` (es). */
export function formatInputDate(iso: string, locale: string): string {
  if (!parseIsoDate(iso)) return '';
  return formatter(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'UTC',
  }).format(toUtc(iso));
}

/** Spoken/visible long form, e.g. "Wednesday, November 25, 2026". */
export function formatLongDate(iso: string, locale: string): string {
  return formatter(locale, { dateStyle: 'full', timeZone: 'UTC' }).format(toUtc(iso));
}

export function formatMonthYear(iso: string, locale: string): string {
  return formatter(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(toUtc(iso));
}

/** Short and long weekday names in display order, starting at `weekStart`. */
export function weekdayNames(locale: string, weekStart: number): { short: string; long: string }[] {
  const shortFormat = formatter(locale, { weekday: 'short', timeZone: 'UTC' });
  const longFormat = formatter(locale, { weekday: 'long', timeZone: 'UTC' });
  // 2026-11-01 is a Sunday.
  return Array.from({ length: 7 }, (_, index) => {
    const date = toUtc(addDays('2026-11-01', (weekStart + index) % 7));
    return { short: shortFormat.format(date), long: longFormat.format(date) };
  });
}

/** The locale's own pattern as a hint, e.g. "MM/DD/YYYY". */
export function datePatternHint(locale: string): string {
  const labels = { day: 'DD', month: 'MM', year: 'YYYY' } as const;
  const separator =
    formatter(locale, { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' })
      .formatToParts(new Date(Date.UTC(2026, 10, 25)))
      .find((part) => part.type === 'literal')?.value ?? '/';
  return dateFieldOrder(locale)
    .map((field) => labels[field])
    .join(separator.trim() || separator);
}

/**
 * Typed manual entry. Accepts ISO (`2026-11-25`) in any locale, and the
 * locale's own numeric order with any separator (`25/11/2026`, `25.11.26`,
 * `11-25-2026`). Two-digit years mean 20xx. Returns ISO or null.
 */
export function parseTypedDate(text: string, locale: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const iso = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(trimmed);
  if (iso) {
    const date = { year: Number(iso[1]), month: Number(iso[2]), day: Number(iso[3]) };
    return isRealDate(date) ? toIsoDate(date) : null;
  }
  const numbers = trimmed.split(/[^\d]+/).filter(Boolean);
  if (numbers.length !== 3) return null;
  const order = dateFieldOrder(locale);
  const fields: Partial<Record<'day' | 'month' | 'year', number>> = {};
  order.forEach((field, index) => {
    fields[field] = Number(numbers[index]);
  });
  let year = fields.year!;
  const yearText = numbers[order.indexOf('year')];
  if (yearText.length <= 2) year += 2000;
  else if (yearText.length !== 4) return null;
  const date = { year, month: fields.month!, day: fields.day! };
  return isRealDate(date) ? toIsoDate(date) : null;
}

/** Today's calendar day in an explicit IANA zone (not the device's). */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  const parts = formatter('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return toIsoDate({ year: get('year'), month: get('month'), day: get('day') });
}

// ── Time ────────────────────────────────────────────────────────────────

const HH_MM = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidTime(value: string): boolean {
  return HH_MM.test(value);
}

export function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(total: number): string {
  const wrapped = ((total % 1440) + 1440) % 1440;
  return `${pad(Math.floor(wrapped / 60))}:${pad(wrapped % 60)}`;
}

/**
 * Typed manual entry for times: `14:30`, `1430`, `9`, `9:05`, `2:30 pm`,
 * `2pm`, `12 am`, `14.30`. Returns `HH:mm` or null.
 */
export function parseTypedTime(text: string): string | null {
  const trimmed = text.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!trimmed) return null;
  const match = /^(\d{1,2})(?:[:.h]?(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?$/.exec(trimmed);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = match[2] ? Number(match[2]) : 0;
  const meridiem = match[3]?.[0];
  if (minutes > 59) return null;
  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    if (meridiem === 'a') hours = hours === 12 ? 0 : hours;
    else hours = hours === 12 ? 12 : hours + 12;
  } else if (hours > 23) {
    return null;
  }
  return `${pad(hours)}:${pad(minutes)}`;
}

/** Locale display, e.g. "2:30 PM" (en-US) or "14:30" (es). */
export function formatTime(value: string, locale: string): string {
  if (!isValidTime(value)) return '';
  const [hours, minutes] = value.split(':').map(Number);
  return formatter(locale, { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(
    new Date(Date.UTC(2026, 0, 1, hours, minutes)),
  );
}

/** Every `step` minutes from `min` to `max` inclusive. */
export function timeOptions(stepMinutes: number, min = '00:00', max = '23:59'): string[] {
  const options: string[] = [];
  for (let total = timeToMinutes(min); total <= timeToMinutes(max); total += stepMinutes) {
    options.push(minutesToTime(total));
  }
  return options;
}

/** Short zone name for a hint, e.g. "WAT" or "GMT+1"; falls back to the id. */
export function timeZoneLabel(timeZone: string, locale: string, now: Date = new Date()): string {
  try {
    const name = formatter(locale, { timeZone, timeZoneName: 'short' })
      .formatToParts(now)
      .find((part) => part.type === 'timeZoneName')?.value;
    return name && name !== timeZone ? `${timeZone} (${name})` : timeZone;
  } catch {
    return timeZone;
  }
}
