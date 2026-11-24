// Pure week-view maths for the patient-facing doctor profile (issue #13).
// Reuses the doctor availability calendar's proven zone/DST helpers rather than
// re-deriving them: every slot is a UTC instant, every day bucket and clock
// reading is rendered in the patient's chosen time zone.
import {
  buildWeekDates,
  dateInZone,
  formatClockRange,
  formatDayHeading,
  sortByStartTime,
  startOfWeek,
  todayInZone,
} from '../availability/calendar';
import type { AvailabilitySlot } from '../../types/models';

export interface WeekDaySlots {
  /** `YYYY-MM-DD` in the patient's zone. */
  date: string;
  heading: string;
  slots: AvailabilitySlot[];
}

/** The Monday starting the week `now` falls in, in the patient's zone. */
export function currentWeekStart(now: Date, timeZone: string): string {
  return startOfWeek(todayInZone(now, timeZone));
}

/** Seven day buckets (Monday first), each with its slots sorted by start. */
export function buildWeekSlots(
  slots: readonly AvailabilitySlot[],
  weekStart: string,
  timeZone: string,
): WeekDaySlots[] {
  const byDay = new Map<string, AvailabilitySlot[]>();
  for (const slot of slots) {
    const day = dateInZone(slot.startTime, timeZone);
    const bucket = byDay.get(day);
    if (bucket) bucket.push(slot);
    else byDay.set(day, [slot]);
  }

  return buildWeekDates(weekStart).map((date) => ({
    date,
    heading: formatDayHeading(date, 'long'),
    slots: sortByStartTime(byDay.get(date) ?? []),
  }));
}

export function maxSlotsPerDay(days: readonly WeekDaySlots[]): number {
  return days.reduce((max, day) => Math.max(max, day.slots.length), 0);
}

/** First open slot strictly after the rendered week — the empty week's
 * "next available" sentence. */
export function nextAvailableAfterWeek(
  slots: readonly AvailabilitySlot[],
  weekStart: string,
  timeZone: string,
): AvailabilitySlot | null {
  const weekDates = new Set(buildWeekDates(weekStart));
  const later = sortByStartTime(slots).filter(
    (slot) => !weekDates.has(dateInZone(slot.startTime, timeZone)),
  );
  return later[0] ?? null;
}

export function slotClockRange(slot: AvailabilitySlot, timeZone: string): string {
  return formatClockRange(slot.startTime, slot.endTime, timeZone);
}

export function slotDayLabel(slot: AvailabilitySlot, timeZone: string): string {
  return formatDayHeading(dateInZone(slot.startTime, timeZone), 'long');
}
