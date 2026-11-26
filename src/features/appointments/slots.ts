// Slot picker date logic — pure and clock-injected, no React, no fetch.
//
// Slot instants come from Postgres as UTC; the patient reads them in their own
// zone, so every formatter takes an optional { locale, timeZone } and defaults
// to the browser's. Tests pin both, which is what makes assertions about a
// rendered time deterministic instead of environment-dependent.
//
// (App-wide time-zone policy is its own roadmap issue, #110 — this file only
// guarantees that what it prints is the instant's local rendering, not a
// UTC midnight or a naive string comparison.)
import type { AvailabilitySlot } from '../../types/models';

export interface FormatOptions {
  locale?: string;
  timeZone?: string;
}

export interface SlotDayGroup {
  /** Local calendar day of the first slot, `YYYY-MM-DD` in `timeZone`. */
  dayKey: string;
  /** Human label for that day, e.g. "Tue, 20 Oct 2026". */
  dayLabel: string;
  slots: AvailabilitySlot[];
}

/**
 * What the patient may actually pick: not their current slot (moving to the
 * same time is not a reschedule), not a slot that is no longer open, not one
 * that has already started — and always ascending, so the picker reads like a
 * calendar rather than an arbitrary server order.
 */
export function selectableSlots(
  slots: AvailabilitySlot[],
  { now, currentSlotId }: { now: Date; currentSlotId?: string },
): AvailabilitySlot[] {
  const nowMs = now.getTime();
  return slots
    .filter((slot) => {
      if (slot.id === currentSlotId) return false;
      if (slot.status !== 'open') return false;
      const start = Date.parse(slot.startTime);
      return !Number.isNaN(start) && start > nowMs;
    })
    .slice()
    .sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime));
}

/** Groups already-filtered slots by their local day, keeping ascending order
 * within each day and day order across them. */
export function groupSlotsByDay(slots: AvailabilitySlot[], options: FormatOptions = {}): SlotDayGroup[] {
  const groups: SlotDayGroup[] = [];
  const indexByDay = new Map<string, SlotDayGroup>();

  for (const slot of slots) {
    const dayKey = isoDayKey(slot.startTime, options);
    const existing = indexByDay.get(dayKey);
    if (existing) {
      existing.slots.push(slot);
      continue;
    }
    const group: SlotDayGroup = {
      dayKey,
      dayLabel: formatDayLabel(slot.startTime, options),
      slots: [slot],
    };
    indexByDay.set(dayKey, group);
    groups.push(group);
  }

  return groups;
}

/** `YYYY-MM-DD` for the instant in the given zone — stable across locales. */
function isoDayKey(iso: string, { timeZone }: FormatOptions = {}): string {
  const date = toDate(iso);
  if (!date) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function formatTimeOfDay(iso: string, options: FormatOptions = {}): string {
  const date = toDate(iso);
  if (!date) return '—';
  return new Intl.DateTimeFormat(options.locale, {
    timeZone: options.timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

export function formatDayLabel(iso: string, options: FormatOptions = {}): string {
  const date = toDate(iso);
  if (!date) return '—';
  return new Intl.DateTimeFormat(options.locale, {
    timeZone: options.timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/** "09:00 – 09:30" */
export function formatSlotRange(slot: AvailabilitySlot, options: FormatOptions = {}): string {
  return `${formatTimeOfDay(slot.startTime, options)} – ${formatTimeOfDay(slot.endTime, options)}`;
}

/** "Tue, 20 Oct 2026, 09:00 – 09:30" — used in the confirm step and result. */
export function formatSlotDateTime(slot: AvailabilitySlot, options: FormatOptions = {}): string {
  return `${formatDayLabel(slot.startTime, options)}, ${formatSlotRange(slot, options)}`;
}

/** "Tue, 20 Oct 2026, 09:00" — for instants that are not a slot (e.g. an
 * intake's `createdAt`). */
export function formatInstant(iso: string, options: FormatOptions = {}): string {
  return `${formatDayLabel(iso, options)}, ${formatTimeOfDay(iso, options)}`;
}

function toDate(iso: string): Date | null {
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : new Date(ms);
}
