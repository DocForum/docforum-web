import { describe, expect, it } from 'vitest';
import { RESCHEDULE_CUTOFF_MS, formatDuration, rescheduleWindow } from './cutoff';
import type { AppointmentStatus, PatientAppointment } from '../../types/models';

const START = '2026-10-20T09:00:00.000Z';

function makeAppointment(overrides: Partial<PatientAppointment> = {}): PatientAppointment {
  const { availabilitySlot, ...rest } = overrides;
  return {
    id: 'appt-1',
    patientProfileId: 'pp-1',
    doctorProfileId: 'dp-1',
    availabilitySlotId: 'slot-1',
    status: 'scheduled',
    origin: 'direct_booking',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    availabilitySlot: {
      id: 'slot-1',
      doctorProfileId: 'dp-1',
      status: 'booked',
      startTime: START,
      endTime: '2026-10-20T09:30:00.000Z',
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
      ...availabilitySlot,
    },
    ...rest,
  };
}

describe('rescheduleWindow', () => {
  it('allows a scheduled appointment well outside the cutoff', () => {
    const now = new Date('2026-10-19T09:00:00.000Z'); // 24h before
    const window = rescheduleWindow(makeAppointment(), now);

    expect(window.allowed).toBe(true);
    expect(window.blockedReason).toBeNull();
    expect(window.closesAt).toBe('2026-10-20T07:00:00.000Z');
  });

  it('blocks inside the window and states the cutoff plus how long is left', () => {
    const now = new Date('2026-10-20T08:13:00.000Z'); // 47 minutes before
    const window = rescheduleWindow(makeAppointment(), now);

    expect(window.allowed).toBe(false);
    expect(window.blockedReason).toMatch(/Rescheduling closes 2 hours before your appointment/);
    expect(window.blockedReason).toMatch(/starts in 47 minutes/);
  });

  it('treats exactly-at-the-boundary as inside the window, not outside it', () => {
    const now = new Date(Date.parse(START) - RESCHEDULE_CUTOFF_MS);
    const window = rescheduleWindow(makeAppointment(), now);

    expect(window.allowed).toBe(false);
    expect(window.blockedReason).toMatch(/starts in 2 hours\./);
  });

  it('blocks once the start time has passed', () => {
    const now = new Date(Date.parse(START) + 60_000);
    const window = rescheduleWindow(makeAppointment(), now);

    expect(window.allowed).toBe(false);
    expect(window.blockedReason).toMatch(/start time has passed/);
  });

  it.each<[AppointmentStatus, RegExp]>([
    ['completed', /is complete/],
    ['cancelled', /was cancelled/],
    ['no_show', /no-show/],
  ])('blocks a %s appointment with a reason naming that status', (status, reason) => {
    const window = rescheduleWindow(makeAppointment({ status }), new Date('2026-10-01T00:00:00.000Z'));

    expect(window.allowed).toBe(false);
    expect(window.blockedReason).toMatch(reason);
  });

  it('fails closed when the slot time cannot be parsed', () => {
    const window = rescheduleWindow(
      makeAppointment({ availabilitySlot: { startTime: 'not-a-date' } as PatientAppointment['availabilitySlot'] }),
      new Date('2026-10-01T00:00:00.000Z'),
    );

    expect(window.allowed).toBe(false);
    expect(window.blockedReason).toMatch(/can.t be read/);
    expect(window.closesAt).toBeNull();
  });
});

describe('formatDuration', () => {
  it.each<[number, string]>([
    [30_000, 'under a minute'],
    [60_000, 'a minute'],
    [47 * 60_000, '47 minutes'],
    [60 * 60_000, '1 hour'],
    [125 * 60_000, '2 hours 5 minutes'],
    [48 * 60 * 60_000, '2 days'],
    [51 * 60 * 60_000, '2 days 3 hours'],
  ])('renders %i ms as %s', (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });
});
