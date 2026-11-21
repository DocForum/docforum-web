import { describe, expect, it } from 'vitest';
import type { CancellationPolicy, PatientAppointment } from '../../types/models';
import { cancellationOutcome, formatCutoff } from './cancellation';

const POLICY: CancellationPolicy = {
  lateCancellationCutoffMinutes: 120,
  releaseSlotBeforeCutoff: true,
  releaseSlotAfterCutoff: true,
  recordLateCancellation: true,
  referralHandling: 'returns_to_referral_queue',
};

function appointmentIn(minutes: number, overrides: Partial<PatientAppointment> = {}): PatientAppointment {
  const start = new Date(Date.now() + minutes * 60_000);
  const end = new Date(start.getTime() + 30 * 60_000);
  return {
    id: 'apt-1',
    patientProfileId: 'pp-1',
    doctorProfileId: 'dp-1',
    availabilitySlotId: 'slot-1',
    status: 'scheduled',
    origin: 'direct_booking',
    availabilitySlot: {
      id: 'slot-1',
      doctorProfileId: 'dp-1',
      status: 'booked',
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    },
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('cancellationOutcome', () => {
  it('is on time and releases the slot before the cutoff', () => {
    const outcome = cancellationOutcome(appointmentIn(24 * 60), POLICY, new Date());
    expect(outcome.allowed).toBe(true);
    expect(outcome.late).toBe(false);
    expect(outcome.slotReleased).toBe(true);
    expect(outcome.policyStatement).toMatch(/not a late cancellation/i);
    expect(outcome.policyStatement).toMatch(/released/i);
  });

  it('treats exactly the cutoff as late (the boundary belongs to the late side)', () => {
    const appointment = appointmentIn(120);
    const now = new Date(Date.parse(appointment.availabilitySlot.startTime) - 120 * 60_000);
    const outcome = cancellationOutcome(appointment, POLICY, now);
    expect(outcome.late).toBe(true);
    expect(outcome.policyStatement).toMatch(/inside the 2 hours cutoff/i);
    expect(outcome.policyStatement).toMatch(/late cancellation/i);
  });

  it('stays allowed after the cutoff and explains that the slot is not released', () => {
    const outcome = cancellationOutcome(appointmentIn(30), { ...POLICY, releaseSlotAfterCutoff: false }, new Date());
    expect(outcome.allowed).toBe(true);
    expect(outcome.late).toBe(true);
    expect(outcome.slotReleased).toBe(false);
    expect(outcome.policyStatement).toMatch(/stays blocked/i);
  });

  it('does not claim a late cancellation is recorded when the policy says it is not', () => {
    const outcome = cancellationOutcome(
      appointmentIn(30),
      { ...POLICY, recordLateCancellation: false },
      new Date(),
    );
    expect(outcome.policyStatement).toMatch(/late cancellation/i);
    expect(outcome.policyStatement).not.toMatch(/can see that it was late/i);
  });

  it('explains the referral consequence for referral-origin visits', () => {
    const outcome = cancellationOutcome(
      appointmentIn(24 * 60, { origin: 'referral' }),
      POLICY,
      new Date(),
    );
    expect(outcome.referralStatement).toMatch(/back to the referral queue/i);

    const direct = cancellationOutcome(appointmentIn(24 * 60), POLICY, new Date());
    expect(direct.referralStatement).toBeNull();
  });

  it('uses a different referral sentence when cancelling closes the referral', () => {
    const outcome = cancellationOutcome(
      appointmentIn(24 * 60, { origin: 'referral' }),
      { ...POLICY, referralHandling: 'referral_closed' },
      new Date(),
    );
    expect(outcome.referralStatement).toMatch(/also closes that referral/i);
  });

  it('blocks a settled visit instead of offering a pointless cancel', () => {
    const outcome = cancellationOutcome(
      appointmentIn(60, { status: 'completed' }),
      POLICY,
      new Date(),
    );
    expect(outcome.allowed).toBe(false);
    expect(outcome.blockedReason).toMatch(/already complete/i);
  });

  it('blocks a visit whose start has passed and points to the clinic', () => {
    const outcome = cancellationOutcome(
      appointmentIn(-10, { availabilitySlot: { ...appointmentIn(-10).availabilitySlot } }),
      POLICY,
      new Date(),
    );
    expect(outcome.allowed).toBe(false);
    expect(outcome.blockedReason).toMatch(/call the clinic/i);
  });
});

describe('formatCutoff', () => {
  it('renders hours and minutes in plain English', () => {
    expect(formatCutoff(120)).toBe('2 hours');
    expect(formatCutoff(90)).toBe('1 hour 30 minutes');
    expect(formatCutoff(30)).toBe('30 minutes');
    expect(formatCutoff(1)).toBe('1 minute');
  });
});
