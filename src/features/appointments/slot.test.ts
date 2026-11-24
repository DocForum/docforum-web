import { describe, expect, it } from 'vitest';
import { formatSlotDate, formatSlotTime, isOnSlotDay, isUpcoming, shouldPollQueue } from './slot';
import type { PatientAppointment } from '../../types/models';

/** Local-time builders, so nothing in these assertions depends on the TZ the
 * suite happens to run in. */
function local(dayOffset: number, hour: number, minute = 0): string {
  const base = new Date(2026, 9, 16, 9, 0, 0);
  base.setDate(base.getDate() + dayOffset);
  base.setHours(hour, minute, 0, 0);
  return base.toISOString();
}

const TODAY = new Date(2026, 9, 16, 12, 0, 0);

function appointment(overrides: Partial<PatientAppointment> = {}): PatientAppointment {
  return {
    id: 'apt-1',
    patientProfileId: 'pp-1',
    doctorProfileId: 'dp-1',
    availabilitySlotId: 'slot-1',
    status: 'scheduled',
    origin: 'direct_booking',
    createdAt: local(-3, 9),
    updatedAt: local(-3, 9),
    availabilitySlot: {
      id: 'slot-1',
      doctorProfileId: 'dp-1',
      status: 'booked',
      startTime: local(0, 14, 30),
      endTime: local(0, 15),
      createdAt: local(-10, 9),
      updatedAt: local(-10, 9),
    },
    ...overrides,
  };
}

function withSlot(overrides: Partial<PatientAppointment['availabilitySlot']>): PatientAppointment {
  const base = appointment();
  return { ...base, availabilitySlot: { ...base.availabilitySlot, ...overrides } };
}

describe('slot day maths', () => {
  it('recognises the day of the visit', () => {
    expect(isOnSlotDay(appointment(), TODAY)).toBe(true);
    expect(isOnSlotDay(withSlot({ startTime: local(1, 9) }), TODAY)).toBe(false);
  });

  it('treats a slot near midnight as still being that local day', () => {
    expect(isOnSlotDay(withSlot({ startTime: local(0, 0, 5) }), TODAY)).toBe(true);
    expect(isOnSlotDay(withSlot({ startTime: local(0, 23, 45) }), TODAY)).toBe(true);
  });

  it('polls only a scheduled visit happening today', () => {
    expect(shouldPollQueue(appointment(), TODAY)).toBe(true);
    expect(shouldPollQueue(withSlot({ startTime: local(1, 9) }), TODAY)).toBe(false);
    expect(shouldPollQueue(appointment({ status: 'completed' }), TODAY)).toBe(false);
    expect(shouldPollQueue(appointment({ status: 'cancelled' }), TODAY)).toBe(false);
  });

  it('keeps a future visit upcoming and drops a past one', () => {
    expect(isUpcoming(withSlot({ startTime: local(5, 9) }), TODAY)).toBe(true);
    expect(isUpcoming(appointment(), TODAY)).toBe(true);
    expect(isUpcoming(withSlot({ startTime: local(-1, 9) }), TODAY)).toBe(false);
    expect(isUpcoming(appointment({ status: 'cancelled' }), TODAY)).toBe(false);
  });

  it('labels the day in the words a patient would use', () => {
    expect(formatSlotDate(local(0, 9), TODAY)).toBe('today');
    expect(formatSlotDate(local(1, 9), TODAY)).toBe('tomorrow');
    expect(formatSlotDate(local(4, 9), TODAY)).toMatch(/2026/);
  });

  it('prints a 24-hour start time and never a made-up one', () => {
    expect(formatSlotTime(local(0, 9, 5))).toBe('09:05');
    expect(formatSlotTime('not-a-date')).toBe('not-a-date');
  });
});
