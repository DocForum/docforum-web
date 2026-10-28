import { describe, expect, it } from 'vitest';
import {
  buildCourses,
  buildMedicationSchedule,
  parseDuration,
  parseFrequency,
} from './schedule';
import type { MedicationPrescription, PrescriptionItem } from '../../types/models';

// Fixed clock for every time-based assertion — derivation never reads the
// real clock, so these stay deterministic.
const NOW = new Date(2026, 3, 15, 12, 0, 0);

function item(overrides: Partial<PrescriptionItem> = {}): PrescriptionItem {
  return {
    id: 'item-1',
    drugName: 'Amoxicillin',
    dosage: '500 mg',
    frequency: 'every 8 hours',
    duration: '7 days',
    ...overrides,
  };
}

function rx(overrides: Partial<MedicationPrescription> = {}): MedicationPrescription {
  return {
    id: 'rx-1',
    status: 'issued',
    createdAt: '2026-04-15T06:00:00',
    patientProfileId: 'pp-1',
    prescribingDoctorId: 'dr-1',
    prescribingDoctorName: 'Dr Okafor',
    items: [item()],
    ...overrides,
  };
}

describe('parseFrequency', () => {
  it('reads "every 8 hours" as an 8-hour interval', () => {
    expect(parseFrequency('every 8 hours', 'Amoxicillin')).toEqual({ kind: 'interval', everyHours: 8 });
  });

  it('reads the Latin "q6h" as a 6-hour interval', () => {
    expect(parseFrequency('q6h', 'Ibuprofen')).toEqual({ kind: 'interval', everyHours: 6 });
  });

  it('is case and whitespace insensitive', () => {
    expect(parseFrequency('  EVERY 12 HOURS ', 'X')).toEqual({ kind: 'interval', everyHours: 12 });
  });

  it('reads "twice daily" as two conventional times', () => {
    const parsed = parseFrequency('twice daily', 'Metformin');
    expect(parsed.kind).toBe('daily-times');
    expect(parsed.kind === 'daily-times' && parsed.times).toHaveLength(2);
  });

  it('reads "three times daily" as three times', () => {
    const parsed = parseFrequency('three times daily', 'X');
    expect(parsed.kind === 'daily-times' && parsed.times).toHaveLength(3);
  });

  it('reads "four times a day" as four times', () => {
    const parsed = parseFrequency('four times a day', 'X');
    expect(parsed.kind === 'daily-times' && parsed.times).toHaveLength(4);
  });

  it('reads a bare "daily" as a single morning anchor', () => {
    expect(parseFrequency('daily', 'X')).toEqual({ kind: 'daily-times', times: ['08:00'] });
  });

  it('reads "every night" as the night anchor', () => {
    expect(parseFrequency('every night', 'X')).toEqual({ kind: 'daily-times', times: ['22:00'] });
  });

  it('reads "as needed" as as_needed, never scheduled', () => {
    expect(parseFrequency('as needed', 'X')).toEqual({ kind: 'as_needed' });
  });

  it('reads "PRN" as as_needed', () => {
    expect(parseFrequency('PRN', 'X')).toEqual({ kind: 'as_needed' });
  });

  it('keeps "every 6 hours as needed" as as_needed rather than inventing times', () => {
    expect(parseFrequency('1 tablet every 6 hours as needed', 'X').kind).toBe('as_needed');
  });

  it('leaves unrecognised phrasing as free_text', () => {
    expect(parseFrequency('take with food', 'X')).toEqual({ kind: 'free_text' });
  });

  it('leaves vague "several times a day" as free_text', () => {
    expect(parseFrequency('several times a day', 'X').kind).toBe('free_text');
  });

  it('treats an empty frequency as free_text', () => {
    expect(parseFrequency('   ', 'X')).toEqual({ kind: 'free_text' });
  });
});

describe('parseDuration', () => {
  it('converts days', () => {
    expect(parseDuration('7 days')).toEqual({ kind: 'days', days: 7 });
  });

  it('converts weeks to days', () => {
    expect(parseDuration('2 weeks')).toEqual({ kind: 'days', days: 14 });
  });

  it('approximates months to 30 days', () => {
    expect(parseDuration('1 month')).toEqual({ kind: 'days', days: 30 });
  });

  it('treats "ongoing" as open-ended', () => {
    expect(parseDuration('ongoing')).toEqual({ kind: 'open_ended' });
  });

  it('treats an empty duration as open-ended', () => {
    expect(parseDuration('')).toEqual({ kind: 'open_ended' });
  });
});

describe('buildCourses', () => {
  it('marks a course ended once start+duration is before today', () => {
    const courses = buildCourses(
      [rx({ createdAt: '2026-03-01T06:00:00', items: [item({ duration: '7 days' })] })],
      NOW,
    );
    expect(courses[0].ended).toBe(true);
  });

  it('never ends an open-ended course', () => {
    const courses = buildCourses(
      [rx({ createdAt: '2020-01-01T06:00:00', items: [item({ duration: 'ongoing' })] })],
      NOW,
    );
    expect(courses[0].ended).toBe(false);
  });

  it('flags overlapping active courses of the same drug regardless of case', () => {
    const courses = buildCourses(
      [
        rx({ id: 'a', createdAt: '2026-04-10T06:00:00', items: [item({ id: 'i1', drugName: 'Aspirin' })] }),
        rx({ id: 'b', createdAt: '2026-04-12T06:00:00', items: [item({ id: 'i2', drugName: '  aspirin ' })] }),
      ],
      NOW,
    );
    expect(courses.every((c) => c.overlapping)).toBe(true);
  });

  it('does not flag sequential same-drug courses that do not overlap', () => {
    const courses = buildCourses(
      [
        rx({ id: 'a', createdAt: '2026-02-01T06:00:00', items: [item({ id: 'i1', drugName: 'Aspirin', duration: '7 days' })] }),
        rx({ id: 'b', createdAt: '2026-04-12T06:00:00', items: [item({ id: 'i2', drugName: 'Aspirin', duration: '7 days' })] }),
      ],
      NOW,
    );
    // The first course has already ended, so only one is active — no warning.
    expect(courses.filter((c) => !c.ended).every((c) => !c.overlapping)).toBe(true);
  });
});

describe('buildMedicationSchedule', () => {
  it('produces a 7-day week whose first day is Today', () => {
    const schedule = buildMedicationSchedule([rx()], NOW);
    expect(schedule.days).toHaveLength(7);
    expect(schedule.today?.label).toBe('Today');
  });

  it('spaces "every 8 hours" doses from the issue time', () => {
    const schedule = buildMedicationSchedule(
      [rx({ createdAt: '2026-04-14T06:00:00', items: [item({ frequency: 'every 8 hours' })] })],
      NOW,
    );
    const times = schedule.today?.entries.map((e) => e.time) ?? [];
    expect(times).toEqual(['06:00', '14:00', '22:00']);
  });

  it('sorts a day dose list in ascending time order', () => {
    const schedule = buildMedicationSchedule(
      [rx({ createdAt: '2026-04-14T00:00:00', items: [item({ frequency: 'every 5 hours' })] })],
      NOW,
    );
    const times = schedule.today?.entries.map((e) => e.time) ?? [];
    expect(times.length).toBeGreaterThan(1);
    expect(times).toEqual([...times].sort());
  });

  it('excludes ended courses from Today but lists them under ended', () => {
    const schedule = buildMedicationSchedule(
      [rx({ createdAt: '2026-03-01T06:00:00', items: [item({ duration: '7 days' })] })],
      NOW,
    );
    expect(schedule.today?.entries).toHaveLength(0);
    expect(schedule.ended).toHaveLength(1);
  });

  it('lists an "as needed" item under unscheduled with its exact text', () => {
    const schedule = buildMedicationSchedule(
      [rx({ items: [item({ drugName: 'Paracetamol', frequency: 'As needed for pain' })] })],
      NOW,
    );
    expect(schedule.today?.entries).toHaveLength(0);
    expect(schedule.unscheduled).toHaveLength(1);
    expect(schedule.unscheduled[0].frequencyText).toBe('As needed for pain');
    expect(schedule.unscheduled[0].reason).toBe('as_needed');
  });

  it('lists a free-text item under unscheduled rather than inventing a time', () => {
    const schedule = buildMedicationSchedule(
      [rx({ items: [item({ drugName: 'Vitamin D', frequency: 'one capsule with breakfast' })] })],
      NOW,
    );
    expect(schedule.today?.entries).toHaveLength(0);
    expect(schedule.unscheduled[0].reason).toBe('free_text');
  });

  it('reports one overlap warning per duplicated drug', () => {
    const schedule = buildMedicationSchedule(
      [
        rx({ id: 'a', createdAt: '2026-04-10T06:00:00', items: [item({ id: 'i1', drugName: 'Aspirin' })] }),
        rx({ id: 'b', createdAt: '2026-04-12T06:00:00', items: [item({ id: 'i2', drugName: 'aspirin' })] }),
      ],
      NOW,
    );
    expect(schedule.overlaps).toHaveLength(1);
    expect(schedule.overlaps[0].count).toBe(2);
  });
});
