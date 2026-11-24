// Age-of-majority rules for dependents. The client mirrors docforum-core's
// DEPENDENT_NOT_A_MINOR rule so guardians get feedback before the request,
// but the server stays authoritative: a 400 is still mapped to the date field
// in `src/services/error-catalogue.ts`.
//
// Date of birth is a calendar date, not an instant. Parsing "YYYY-MM-DD" with
// `new Date(value)` treats it as UTC midnight, which shifts to the previous
// day west of UTC. Everything here compares year/month/day parts instead.

export interface DateOnly {
  year: number;
  month: number;
  day: number;
}

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function readAgeOfMajorityYears(): number {
  const configured = Number(import.meta.env.VITE_AGE_OF_MAJORITY_YEARS);
  return Number.isInteger(configured) && configured > 0 ? configured : 18;
}

/** Mirrors docforum-core's age-of-majority rule. Defaults to 18; override
 * with `VITE_AGE_OF_MAJORITY_YEARS` for a different jurisdiction. */
export const AGE_OF_MAJORITY_YEARS = readAgeOfMajorityYears();

/** Parses a strict `YYYY-MM-DD` calendar date without going through UTC. */
export function parseDateOnly(value: string): DateOnly | null {
  const match = DATE_ONLY_PATTERN.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

/** The user's current calendar day — not the UTC day. */
export function todayInLocalCalendar(now: Date = new Date()): DateOnly {
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

function compare(a: DateOnly, b: DateOnly): number {
  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
}

/** True while the person is younger than the age of majority. Someone whose
 * birthday is today is no longer a minor. */
export function isMinor(dateOfBirth: string, now: Date = new Date()): boolean {
  const dob = parseDateOnly(dateOfBirth);
  if (!dob) return false;
  const today = todayInLocalCalendar(now);
  const majorityDate: DateOnly = {
    year: dob.year + AGE_OF_MAJORITY_YEARS,
    month: dob.month,
    day: dob.day,
  };
  return compare(today, majorityDate) < 0;
}

export function notAMinorMessage(): string {
  return `Dependents must be under ${AGE_OF_MAJORITY_YEARS}. This person is ${AGE_OF_MAJORITY_YEARS} or older and needs their own account.`;
}

/** Client-side companion to docforum-core's DEPENDENT_NOT_A_MINOR check.
 * `requireMinor` is on for creates; an existing dependent who is already at
 * the age of majority can still have unrelated details edited. */
export function validateDependentDob(
  value: string,
  now: Date = new Date(),
  requireMinor = true,
): string | null {
  if (!value) return 'Date of birth is required.';
  const dob = parseDateOnly(value);
  if (!dob) return 'Enter a valid date.';
  const today = todayInLocalCalendar(now);
  if (compare(dob, today) > 0) return 'Date of birth cannot be in the future.';
  const earliest: DateOnly = { year: today.year - 150, month: today.month, day: today.day };
  if (compare(dob, earliest) < 0) return 'Date of birth is implausibly old.';
  if (requireMinor && !isMinor(value, now)) return notAMinorMessage();
  return null;
}
