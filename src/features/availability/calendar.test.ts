import { describe, expect, it } from 'vitest';
import {
  MAX_GENERATE_DAYS,
  addDays,
  appointmentStatusLabel,
  buildCells,
  buildWeekDates,
  dateInZone,
  daysBetween,
  formatClock,
  formatClockRange,
  formatDayHeading,
  gridStepMinutes,
  instantInZone,
  isoDatesBetween,
  isValidIsoDate,
  minutesOfInstant,
  slotGrid,
  slotRowGeometry,
  slotsByDay,
  slotsInTimeRange,
  slotStatusLabel,
  timeRangeOfSlots,
  timeZoneLabel,
  todayInZone,
  windowBounds,
} from './calendar';
import type { AvailabilitySlot } from '../../types/models';

function slot(id: string, start: string, end: string, status: AvailabilitySlot['status'] = 'open'): AvailabilitySlot {
  return {
    id,
    doctorProfileId: 'doctor-1',
    status,
    startTime: start,
    endTime: end,
    createdAt: start,
    updatedAt: start,
  };
}

const LAGOS = 'Africa/Lagos';
const LOS_ANGELES = 'America/Los_Angeles';

describe('calendar dates', () => {
  it('adds a day across a month end without drifting the clock', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('counts days between two dates inclusively via isoDatesBetween', () => {
    expect(daysBetween('2026-10-12', '2026-10-19')).toBe(7);
    expect(isoDatesBetween('2026-10-12', '2026-10-14')).toEqual(['2026-10-12', '2026-10-13', '2026-10-14']);
  });

  it('refuses to build a generate range longer than one request per day allows', () => {
    const dates = isoDatesBetween('2026-10-12', '2026-12-30');
    expect(dates).toHaveLength(MAX_GENERATE_DAYS);
  });

  it('returns an empty list when the range ends before it starts', () => {
    expect(isoDatesBetween('2026-10-20', '2026-10-19')).toEqual([]);
  });

  it('starts the week on Monday and always yields seven days', () => {
    const week = buildWeekDates('2026-10-15');
    expect(week[0]).toBe('2026-10-12');
    expect(week).toHaveLength(7);
    expect(week[6]).toBe('2026-10-18');
  });

  it('rejects a calendar-impossible date string', () => {
    expect(isValidIsoDate('2026-02-30')).toBe(false);
    expect(isValidIsoDate('2026-10-19')).toBe(true);
    expect(isValidIsoDate('19-10-2026')).toBe(false);
  });
});

describe('calendar time zones', () => {
  it('treats a wall-clock window as the doctor\'s time, not UTC', () => {
    expect(instantInZone('2026-06-15', 9 * 60, 'UTC')).toBe('2026-06-15T09:00:00.000Z');
    expect(instantInZone('2026-06-15', 9 * 60, LAGOS)).toBe('2026-06-15T08:00:00.000Z');
  });

  it('follows a zone across its daylight saving change', () => {
    expect(instantInZone('2026-06-15', 9 * 60, LOS_ANGELES)).toBe('2026-06-15T16:00:00.000Z');
    expect(instantInZone('2026-01-15', 9 * 60, LOS_ANGELES)).toBe('2026-01-15T17:00:00.000Z');
  });

  it('puts an instant on the day the doctor sees it', () => {
    expect(dateInZone('2026-03-14T23:30:00.000Z', LAGOS)).toBe('2026-03-15');
    expect(dateInZone('2026-03-14T23:30:00.000Z', 'UTC')).toBe('2026-03-14');
  });

  it('reads today from the injected instant and zone', () => {
    expect(todayInZone(new Date('2026-10-19T23:30:00.000Z'), LAGOS)).toBe('2026-10-20');
  });

  it('reads the minute of the day off the wall clock', () => {
    expect(minutesOfInstant('2026-10-19T08:15:00.000Z', LAGOS)).toBe(9 * 60 + 15);
  });

  it('names the zone and its offset so the header can label times', () => {
    expect(timeZoneLabel(LAGOS, new Date('2026-10-19T08:00:00.000Z'))).toBe('Africa/Lagos (GMT+1)');
    expect(timeZoneLabel(LOS_ANGELES, new Date('2026-10-19T08:00:00.000Z'))).toBe('America/Los_Angeles (GMT-7)');
  });

  it('formats slot times in the doctor\'s zone', () => {
    expect(formatClock('2026-10-19T08:00:00.000Z', LAGOS)).toBe('09:00');
    expect(formatClockRange('2026-10-19T08:00:00.000Z', '2026-10-19T08:30:00.000Z', LAGOS)).toBe('09:00-09:30');
  });

  it('labels a day for the column header', () => {
    expect(formatDayHeading('2026-10-19')).toBe('Mon 19 Oct');
    expect(formatDayHeading('2026-10-19', 'long')).toContain('Monday');
  });

  it('bounds a week by the first and last local midnights', () => {
    const bounds = windowBounds(['2026-10-12', '2026-10-13'], LAGOS);
    expect(bounds).toEqual({ from: '2026-10-11T23:00:00.000Z', to: '2026-10-13T23:00:00.000Z' });
    expect(windowBounds([], LAGOS)).toBeNull();
  });
});

describe('slot grid geometry', () => {
  const monday = [
    slot('s1', '2026-10-19T08:00:00.000Z', '2026-10-19T08:30:00.000Z'),
    slot('s2', '2026-10-19T08:30:00.000Z', '2026-10-19T09:00:00.000Z'),
  ];

  it('picks a row step that divides every slot length exactly', () => {
    expect(gridStepMinutes(monday)).toBe(30);
    expect(gridStepMinutes([slot('a', '2026-10-19T08:00:00.000Z', '2026-10-19T08:45:00.000Z')])).toBe(15);
    expect(gridStepMinutes([])).toBe(15);
  });

  it('floors and ceils the visible window to whole hours', () => {
    const grid = slotGrid(monday, LAGOS);
    expect(grid).toMatchObject({ stepMinutes: 30, startMinutes: 9 * 60, endMinutes: 10 * 60, rows: 2 });
  });

  it('keeps an empty day as tall as a full one', () => {
    const grid = slotGrid([], LAGOS, { start: 6, end: 20 });
    expect(grid.rows).toBe(56);
  });

  it('places a slot on the row its start time falls in', () => {
    const grid = slotGrid([slot('a', '2026-10-19T09:00:00.000Z', '2026-10-19T11:00:00.000Z')], LAGOS);
    expect(slotRowGeometry(slot('b', '2026-10-19T10:00:00.000Z', '2026-10-19T11:00:00.000Z'), grid, LAGOS)).toEqual({
      rowStart: 3,
      rowSpan: 2,
    });
  });

  it('buckets slots into the day column the doctor sees', () => {
    const cells = buildCells(
      [slot('s1', '2026-10-19T08:00:00.000Z', '2026-10-19T08:30:00.000Z'), slot('s2', '2026-10-20T08:00:00.000Z', '2026-10-20T08:30:00.000Z')],
      ['2026-10-19', '2026-10-20', '2026-10-21'],
      LAGOS,
      slotGrid(monday, LAGOS),
    );
    expect(cells.map((column) => column.map((cell) => cell.slotId))).toEqual([['s1'], ['s2'], []]);
  });

  it('gives a cell an accessible name stating time and status', () => {
    const booked = { ...slot('s1', '2026-10-19T08:00:00.000Z', '2026-10-19T08:30:00.000Z', 'booked'), appointment: { id: 'appt-1', status: 'scheduled' as const, patientFullName: 'Ada Obi' } };
    const [column] = buildCells([booked], ['2026-10-19'], LAGOS, slotGrid([booked], LAGOS));
    expect(column[0].accessibleName).toBe('Monday 19 October, 09:00-09:30, Booked, booked with Ada Obi');
  });
});

describe('slot ranges', () => {
  const slots = [
    slot('a', '2026-10-19T08:00:00.000Z', '2026-10-19T09:00:00.000Z'),
    slot('b', '2026-10-20T08:00:00.000Z', '2026-10-20T09:00:00.000Z'),
  ];

  it('spans the earliest start to the latest end of a selection', () => {
    expect(timeRangeOfSlots(slots)).toEqual({ startTime: slots[0].startTime, endTime: slots[1].endTime });
    expect(timeRangeOfSlots([])).toBeNull();
  });

  it('counts a slot that overlaps the range, ignoring one that only touches its end', () => {
    const range = { startTime: '2026-10-19T08:30:00.000Z', endTime: '2026-10-19T10:00:00.000Z' };
    expect(slotsInTimeRange(slots, range).map((entry) => entry.id)).toEqual(['a']);
    const touching = { startTime: '2026-10-19T09:00:00.000Z', endTime: '2026-10-19T11:00:00.000Z' };
    expect(slotsInTimeRange(slots, touching)).toEqual([]);
  });

  it('groups slots by the day they belong to in the doctor\'s zone', () => {
    const byDay = slotsByDay(slots, LAGOS);
    expect([...byDay.keys()]).toEqual(['2026-10-19', '2026-10-20']);
  });
});

describe('slot wording', () => {
  it('spells held slots as blocked-or-held, since the manager uses that status', () => {
    expect(slotStatusLabel('open')).toBe('Open');
    expect(slotStatusLabel('held')).toBe('Held or blocked');
    expect(slotStatusLabel('booked')).toBe('Booked');
  });

  it('describes an appointment as untouched rather than cancelled', () => {
    expect(appointmentStatusLabel('scheduled')).toBe('still scheduled');
    expect(appointmentStatusLabel('cancelled')).toBe('cancelled by the patient');
  });
});
