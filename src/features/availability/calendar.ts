// Pure calendar maths for the doctor availability manager. Everything that
// depends on the clock or a named time zone is funnelled through here with an
// injectable `now` / `timeZone`, so components never read the clock and tests
// never depend on the machine that runs them.
//
// Wall-clock values are always derived through `Intl` with an explicit time
// zone: a slot's `startTime` is a UTC instant, the calendar shows and selects
// in the doctor's zone.

import type { AppointmentStatus, AvailabilitySlot, SlotStatus } from '../../types/models';

export type IsoDate = string; // 'YYYY-MM-DD'
export type IsoInstant = string; // full ISO-8601 UTC

export const MINUTES_PER_HOUR = 60;
export const MINUTES_PER_DAY = 1440;

/** The generate endpoint is single-day, so a range costs one request per day.
 * Capping the range keeps a click from firing 90 cold-starting requests. */
export const MAX_GENERATE_DAYS = 14;

export const DEFAULT_WINDOW_HOURS = { start: 6, end: 20 } as const;

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Largest-first so the grid step stays visually compact; must divide the slot
 * durations exactly, otherwise spanning cells would overlap. */
const STEP_CANDIDATES = [30, 20, 15, 10, 5] as const;
const FALLBACK_STEP_MINUTES = 15;

export function systemTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function isValidIsoDate(value: string): value is IsoDate {
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return false;
  const [, year, month, day] = match;
  const parts = { year: Number(year), month: Number(month), day: Number(day) };
  // `Date.UTC` rolls impossible days into the next month, so round-trip it.
  const rolled = new Date(toUtcMs(parts));
  return (
    rolled.getUTCFullYear() === parts.year &&
    rolled.getUTCMonth() + 1 === parts.month &&
    rolled.getUTCDate() === parts.day
  );
}

export function splitIsoDate(date: IsoDate): DateParts {
  const match = ISO_DATE_PATTERN.exec(date);
  if (!match) throw new RangeError(`Not a YYYY-MM-DD date: ${date}`);
  const [, year, month, day] = match;
  return { year: Number(year), month: Number(month), day: Number(day) };
}

export interface DateParts {
  year: number;
  month: number;
  day: number;
}

function toUtcMs(parts: DateParts): number {
  return Date.UTC(parts.year, parts.month - 1, parts.day);
}

export function joinIsoDate(parts: DateParts): IsoDate {
  const month = String(parts.month).padStart(2, '0');
  const day = String(parts.day).padStart(2, '0');
  return `${parts.year}-${month}-${day}`;
}

/** Calendar-day arithmetic — deliberately not a `Date` plus 24h, so a DST day
 * is still one day. */
export function addDays(date: IsoDate, days: number): IsoDate {
  const shifted = new Date(toUtcMs(splitIsoDate(date)) + days * MS_PER_DAY);
  return joinIsoDate({
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  });
}

export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtcMs(splitIsoDate(to)) - toUtcMs(splitIsoDate(from))) / MS_PER_DAY);
}

/** Inclusive on both ends; returns at most `maxDays` entries. */
export function isoDatesBetween(from: IsoDate, to: IsoDate, maxDays = MAX_GENERATE_DAYS): IsoDate[] {
  const total = daysBetween(from, to) + 1;
  if (total <= 0) return [];
  const dates: IsoDate[] = [];
  for (let offset = 0; offset < Math.min(total, maxDays); offset += 1) {
    dates.push(addDays(from, offset));
  }
  return dates;
}

export function startOfWeek(date: IsoDate): IsoDate {
  const weekday = new Date(toUtcMs(splitIsoDate(date))).getUTCDay(); // 0 = Sunday
  return addDays(date, -((weekday + 6) % 7));
}

export function buildWeekDates(anchor: IsoDate): IsoDate[] {
  const monday = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

function zonedFieldParts(instant: Date, timeZone: string): Record<string, string> {
  const fields = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const out: Record<string, string> = {};
  for (const part of fields) if (part.type !== 'literal') out[part.type] = part.value;
  return out;
}

export function zoneOffsetMinutes(timeZone: string, instant: Date): number {
  const parts = zonedFieldParts(instant, timeZone);
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  );
  return Math.round((asUtc - instant.getTime()) / MS_PER_MINUTE);
}

/** A wall-clock time in the doctor's zone, as a UTC instant. Two passes: the
 * offset at the naive guess, then the offset at the corrected instant — that
 * covers a DST transition falling inside the day. */
export function instantInZone(date: IsoDate, minutesFromMidnight: number, timeZone: string): IsoInstant {
  const wallClockMs = toUtcMs(splitIsoDate(date)) + minutesFromMidnight * MS_PER_MINUTE;
  const guess = new Date(wallClockMs - zoneOffsetMinutes(timeZone, new Date(wallClockMs)) * MS_PER_MINUTE);
  return new Date(wallClockMs - zoneOffsetMinutes(timeZone, guess) * MS_PER_MINUTE).toISOString();
}

export function dateInZone(instant: Date | string, timeZone: string): IsoDate {
  const at = typeof instant === 'string' ? new Date(instant) : instant;
  const parts = zonedFieldParts(at, timeZone);
  return joinIsoDate({
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
  });
}

export function minutesOfInstant(instant: IsoInstant, timeZone: string): number {
  const parts = zonedFieldParts(new Date(instant), timeZone);
  return (Number(parts.hour) % 24) * MINUTES_PER_HOUR + Number(parts.minute);
}

export function todayInZone(now: Date, timeZone: string): IsoDate {
  return dateInZone(now, timeZone);
}

/** Half-open bounds covering the given days, in the doctor's zone. */
export function windowBounds(
  dates: readonly IsoDate[],
  timeZone: string,
): { from: IsoInstant; to: IsoInstant } | null {
  if (dates.length === 0) return null;
  const sorted = [...dates].sort();
  return {
    from: instantInZone(sorted[0], 0, timeZone),
    to: instantInZone(addDays(sorted[sorted.length - 1], 1), 0, timeZone),
  };
}

function formatOffsetAsGmt(offsetMinutes: number): string {
  const sign = offsetMinutes < 0 ? '-' : '+';
  const absolute = Math.abs(offsetMinutes);
  const hours = Math.floor(absolute / MINUTES_PER_HOUR);
  const minutes = absolute % MINUTES_PER_HOUR;
  if (minutes === 0) return `GMT${sign}${hours}`;
  return `GMT${sign}${hours}:${String(minutes).padStart(2, '0')}`;
}

export function zoneShortOffset(timeZone: string, instant: Date = new Date()): string {
  const name = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'shortOffset' })
    .formatToParts(instant)
    .find((part) => part.type === 'timeZoneName')?.value;
  return name && name.length > 0 ? name : formatOffsetAsGmt(zoneOffsetMinutes(timeZone, instant));
}

/** The label the calendar header shows — a zone name is only useful if it is
 * stated out loud, not assumed from the machine. */
export function timeZoneLabel(timeZone: string, instant: Date = new Date()): string {
  return `${timeZone} (${zoneShortOffset(timeZone, instant)})`;
}

export function formatClock(instant: IsoInstant, timeZone: string): string {
  const parts = zonedFieldParts(new Date(instant), timeZone);
  return `${String(Number(parts.hour) % 24).padStart(2, '0')}:${parts.minute}`;
}

export function formatClockRange(startTime: IsoInstant, endTime: IsoInstant, timeZone: string): string {
  return `${formatClock(startTime, timeZone)}-${formatClock(endTime, timeZone)}`;
}

export function formatMinutesAsClock(minutesFromMidnight: number): string {
  const wrapped = ((minutesFromMidnight % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  return `${String(Math.floor(wrapped / MINUTES_PER_HOUR)).padStart(2, '0')}:${String(wrapped % MINUTES_PER_HOUR).padStart(2, '0')}`;
}

/** Date-only arithmetic happens at UTC noon so a DST shift can't move the day. */
function noonInZone(date: IsoDate): Date {
  return new Date(toUtcMs(splitIsoDate(date)) + 12 * 3_600_000);
}

export function formatDayHeading(date: IsoDate, style: 'short' | 'long' = 'short'): string {
  const at = noonInZone(date);
  return new Intl.DateTimeFormat('en-GB', {
    weekday: style === 'long' ? 'long' : 'short',
    day: 'numeric',
    month: style === 'long' ? 'long' : 'short',
  }).format(at);
}

export function slotStatusLabel(status: SlotStatus): string {
  switch (status) {
    case 'open':
      return 'Open';
    case 'held':
      return 'Held or blocked';
    case 'booked':
      return 'Booked';
  }
}

export interface SlotTimeRange {
  startTime: IsoInstant;
  endTime: IsoInstant;
}

export function timeRangeOfSlots(
  slots: readonly Pick<AvailabilitySlot, 'startTime' | 'endTime'>[],
): SlotTimeRange | null {
  if (slots.length === 0) return null;
  let start = slots[0].startTime;
  let end = slots[0].endTime;
  for (const slot of slots) {
    if (new Date(slot.startTime) < new Date(start)) start = slot.startTime;
    if (new Date(slot.endTime) > new Date(end)) end = slot.endTime;
  }
  return { startTime: start, endTime: end };
}

/** Overlap, not containment: a slot touching the range's end boundary is not
 * inside it, but one sticking out of either side is. */
export function slotsInTimeRange<T extends Pick<AvailabilitySlot, 'startTime' | 'endTime'>>(
  slots: readonly T[],
  range: SlotTimeRange,
): T[] {
  const from = new Date(range.startTime).getTime();
  const to = new Date(range.endTime).getTime();
  return slots.filter((slot) => new Date(slot.startTime).getTime() < to && new Date(slot.endTime).getTime() > from);
}

export function sortByStartTime<T extends Pick<AvailabilitySlot, 'startTime'>>(slots: readonly T[]): T[] {
  return [...slots].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
}

export function slotsByDay(
  slots: readonly AvailabilitySlot[],
  timeZone: string,
): Map<IsoDate, AvailabilitySlot[]> {
  const byDay = new Map<IsoDate, AvailabilitySlot[]>();
  for (const slot of slots) {
    const day = dateInZone(slot.startTime, timeZone);
    const bucket = byDay.get(day);
    if (bucket) bucket.push(slot);
    else byDay.set(day, [slot]);
  }
  for (const bucket of byDay.values()) bucket.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  return byDay;
}

function greatestCommonDivisor(a: number, b: number): number {
  return b === 0 ? a : greatestCommonDivisor(b, a % b);
}

/** Row granularity: the largest candidate step that divides every slot
 * duration exactly, so cells never overlap on the grid. */
export function gridStepMinutes(slots: readonly Pick<AvailabilitySlot, 'startTime' | 'endTime'>[]): number {
  const durations = slots.map((slot) =>
    Math.round((new Date(slot.endTime).getTime() - new Date(slot.startTime).getTime()) / MS_PER_MINUTE),
  );
  const relevant = durations.filter((duration) => duration > 0);
  if (relevant.length === 0) return FALLBACK_STEP_MINUTES;
  const gcd = relevant.reduce((acc, duration) => greatestCommonDivisor(acc, duration));
  const candidate = STEP_CANDIDATES.find((step) => gcd % step === 0);
  return candidate ?? Math.max(1, Math.min(gcd, FALLBACK_STEP_MINUTES));
}

export interface SlotGrid {
  stepMinutes: number;
  startMinutes: number;
  endMinutes: number;
  rows: number;
}

/** Time-of-day window the grid spans, floored/ceiled to the hour so the gutter
 * labels line up; identical for every day in the window so columns align. */
export function slotGrid(
  slots: readonly AvailabilitySlot[],
  timeZone: string,
  windowHours: { start: number; end: number } = DEFAULT_WINDOW_HOURS,
): SlotGrid {
  const stepMinutes = gridStepMinutes(slots);
  if (slots.length === 0) {
    const startMinutes = windowHours.start * MINUTES_PER_HOUR;
    const endMinutes = Math.min(MINUTES_PER_DAY, windowHours.end * MINUTES_PER_HOUR);
    return { stepMinutes, startMinutes, endMinutes, rows: Math.max(1, (endMinutes - startMinutes) / stepMinutes) };
  }
  const minutes = slots.map((slot) => ({
    start: minutesOfInstant(slot.startTime, timeZone),
    end: minutesOfInstant(slot.endTime, timeZone),
  }));
  const earliest = Math.min(...minutes.map((entry) => entry.start));
  const latest = Math.max(...minutes.map((entry) => entry.end));
  const startMinutes = Math.max(0, Math.floor(earliest / MINUTES_PER_HOUR) * MINUTES_PER_HOUR);
  const endMinutes = Math.min(MINUTES_PER_DAY, Math.max(Math.ceil(latest / MINUTES_PER_HOUR) * MINUTES_PER_HOUR, startMinutes + MINUTES_PER_HOUR));
  return { stepMinutes, startMinutes, endMinutes, rows: (endMinutes - startMinutes) / stepMinutes };
}

export interface SlotCell {
  slotId: string;
  date: IsoDate;
  status: SlotStatus;
  startTime: IsoInstant;
  endTime: IsoInstant;
  /** 1-based CSS grid line inside the day column. */
  rowStart: number;
  rowSpan: number;
  accessibleName: string;
}

export function slotRowGeometry(
  slot: Pick<AvailabilitySlot, 'startTime' | 'endTime'>,
  grid: SlotGrid,
  timeZone: string,
): { rowStart: number; rowSpan: number } {
  const offset = minutesOfInstant(slot.startTime, timeZone) - grid.startMinutes;
  const duration = Math.round((new Date(slot.endTime).getTime() - new Date(slot.startTime).getTime()) / MS_PER_MINUTE);
  return {
    rowStart: Math.max(1, Math.floor(offset / grid.stepMinutes) + 1),
    rowSpan: Math.max(1, Math.round(duration / grid.stepMinutes)),
  };
}

export function buildCells(
  slots: readonly AvailabilitySlot[],
  dates: readonly IsoDate[],
  timeZone: string,
  grid: SlotGrid,
): SlotCell[][] {
  const byDay = slotsByDay(slots, timeZone);
  return dates.map((date) => {
    const daySlots = byDay.get(date) ?? [];
    return daySlots.map((slot) => ({
      slotId: slot.id,
      date,
      status: slot.status,
      startTime: slot.startTime,
      endTime: slot.endTime,
      ...slotRowGeometry(slot, grid, timeZone),
      accessibleName: cellAccessibleName(slot, date, timeZone),
    }));
  });
}

export function cellAccessibleName(slot: AvailabilitySlot, date: IsoDate, timeZone: string): string {
  const patient = slot.appointment?.patientFullName;
  const who = patient ? `, booked with ${patient}` : '';
  return `${formatDayHeading(date, 'long')}, ${formatClockRange(slot.startTime, slot.endTime, timeZone)}, ${slotStatusLabel(slot.status)}${who}`;
}

export interface HourLabel {
  label: string;
  rowStart: number;
  rowSpan: number;
}

export function hourLabels(grid: SlotGrid): HourLabel[] {
  const labels: HourLabel[] = [];
  const rowsPerHour = MINUTES_PER_HOUR / grid.stepMinutes;
  if (!Number.isInteger(rowsPerHour)) return labels;
  for (let minutes = grid.startMinutes; minutes < grid.endMinutes; minutes += MINUTES_PER_HOUR) {
    labels.push({
      label: formatMinutesAsClock(minutes),
      rowStart: (minutes - grid.startMinutes) / grid.stepMinutes + 1,
      rowSpan: rowsPerHour,
    });
  }
  return labels;
}

/** Appointment statuses a doctor must not read as "cancelled by me". */
export function appointmentStatusLabel(status: AppointmentStatus): string {
  switch (status) {
    case 'scheduled':
      return 'still scheduled';
    case 'checked_in':
      return 'checked in';
    case 'in_progress':
      return 'in progress';
    case 'completed':
      return 'completed';
    case 'cancelled':
      return 'cancelled by the patient';
    case 'no_show':
      return 'marked as a no-show';
  }
}
