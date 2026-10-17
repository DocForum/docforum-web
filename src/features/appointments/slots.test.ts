import { describe, expect, it } from 'vitest';
import {
  formatDayLabel,
  formatInstant,
  formatSlotDateTime,
  formatSlotRange,
  formatTimeOfDay,
  groupSlotsByDay,
  selectableSlots,
} from './slots';
import type { AvailabilitySlot, SlotStatus } from '../../types/models';

/** Pinned so a rendered time is asserted, not inferred from whatever locale
 * or zone the machine running the suite happens to be in. */
const Pinned = { locale: 'en-US', timeZone: 'UTC' } as const;

function makeSlot(id: string, startTime: string, endTime: string, status: SlotStatus = 'open'): AvailabilitySlot {
  return {
    id,
    doctorProfileId: 'dp-1',
    status,
    startTime,
    endTime,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  };
}

const NOW = new Date('2026-10-20T09:15:00.000Z');

describe('selectableSlots', () => {
  const slots = [
    makeSlot('late', '2026-10-20T11:00:00.000Z', '2026-10-20T11:30:00.000Z'),
    makeSlot('past', '2026-10-20T09:00:00.000Z', '2026-10-20T09:30:00.000Z'),
    makeSlot('current', '2026-10-21T09:00:00.000Z', '2026-10-21T09:30:00.000Z'),
    makeSlot('held', '2026-10-20T10:00:00.000Z', '2026-10-20T10:30:00.000Z', 'held'),
    makeSlot('first', '2026-10-22T09:00:00.000Z', '2026-10-22T09:30:00.000Z'),
  ];

  it('drops the current slot, non-open slots and anything already started', () => {
    const result = selectableSlots(slots, { now: NOW, currentSlotId: 'current' });

    expect(result.map((slot) => slot.id)).toEqual(['late', 'first']);
  });

  it('returns ascending by start time regardless of input order', () => {
    const result = selectableSlots(slots, { now: NOW, currentSlotId: 'current' });

    const starts = result.map((slot) => Date.parse(slot.startTime));
    expect([...starts].sort((a, b) => a - b)).toEqual(starts);
  });

  it('does not mutate the array it was given', () => {
    const input = [...slots];
    selectableSlots(input, { now: NOW, currentSlotId: 'current' });

    expect(input).toHaveLength(slots.length);
  });
});

describe('groupSlotsByDay', () => {
  it('groups by local calendar day, keeping day and slot order', () => {
    const groups = groupSlotsByDay(
      [
        makeSlot('a', '2026-10-20T09:00:00.000Z', '2026-10-20T09:30:00.000Z'),
        makeSlot('b', '2026-10-20T14:00:00.000Z', '2026-10-20T14:30:00.000Z'),
        makeSlot('c', '2026-10-21T09:00:00.000Z', '2026-10-21T09:30:00.000Z'),
      ],
      Pinned,
    );

    expect(groups.map((group) => group.dayKey)).toEqual(['2026-10-20', '2026-10-21']);
    expect(groups[0].dayLabel).toBe('Tue, Oct 20, 2026');
    expect(groups[1].dayLabel).toBe('Wed, Oct 21, 2026');
    expect(groups[0].slots.map((slot) => slot.id)).toEqual(['a', 'b']);
    expect(groups[1].slots.map((slot) => slot.id)).toEqual(['c']);
  });

  it('returns nothing for an empty slot list', () => {
    expect(groupSlotsByDay([], Pinned)).toEqual([]);
  });
});

describe('time formatting', () => {
  it('renders a slot range in the requested zone', () => {
    const slot = makeSlot('a', '2026-10-20T09:00:00.000Z', '2026-10-20T09:30:00.000Z');

    expect(formatSlotRange(slot, Pinned)).toBe('09:00 – 09:30');
    expect(formatSlotDateTime(slot, Pinned)).toBe('Tue, Oct 20, 2026, 09:00 – 09:30');
  });

  it('renders midnight as 00:00 rather than 24:00', () => {
    expect(formatTimeOfDay('2026-10-21T00:00:00.000Z', Pinned)).toBe('00:00');
  });

  it('renders an instant that is not a slot (an intake timestamp)', () => {
    expect(formatInstant('2026-10-20T09:00:00.000Z', Pinned)).toBe('Tue, Oct 20, 2026, 09:00');
  });

  it('renders an unparseable value as an em dash instead of throwing', () => {
    expect(formatDayLabel('not-a-date', Pinned)).toBe('—');
    expect(formatTimeOfDay('not-a-date', Pinned)).toBe('—');
  });

  it('uses the browser locale and zone when none is pinned', () => {
    const slot = makeSlot('a', '2026-10-20T09:00:00.000Z', '2026-10-20T09:30:00.000Z');

    expect(formatSlotRange(slot)).toMatch(/09:00/);
  });
});
