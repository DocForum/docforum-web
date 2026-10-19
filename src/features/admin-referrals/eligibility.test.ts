import { describe, expect, it } from 'vitest';
import { chainDoctorIds, eligibleCandidates } from './eligibility';
import type { DoctorAvailability, Specialty, StuckReferral } from '../../types/models';

const CARDIOLOGY: Specialty = { id: 'spec-cardio', name: 'Cardiology', slug: 'cardiology' };
const DERMATOLOGY: Specialty = { id: 'spec-derm', name: 'Dermatology', slug: 'dermatology' };

const referral: StuckReferral = {
  id: 'ref-1',
  sourceConsultationId: 'consult-1',
  referringDoctorId: 'doc-gp',
  targetSpecialtyId: CARDIOLOGY.id,
  targetDoctorId: 'doc-on-leave',
  parentReferralId: null,
  status: 'pending',
  resultingAppointmentId: null,
  createdAt: '2026-10-14T09:00:00.000Z',
  updatedAt: '2026-10-14T09:00:00.000Z',
  stuckReason: 'doctor_inactive',
  targetSpecialty: CARDIOLOGY,
  referringDoctor: { id: 'doc-gp', fullName: 'Dr. Grace Park' },
  targetDoctor: { id: 'doc-on-leave', fullName: 'Dr. Leo Vance' },
  chain: null,
};

function doctor(overrides: Partial<DoctorAvailability> & Pick<DoctorAvailability, 'id' | 'fullName'>): DoctorAvailability {
  return {
    verificationStatus: 'verified',
    specialties: [CARDIOLOGY],
    openSlotCount: 3,
    nextAvailableAt: '2026-10-20T09:00:00.000Z',
    ...overrides,
  };
}

const ids = (doctors: DoctorAvailability[]) => doctors.map((d) => d.id);

describe('eligibleCandidates', () => {
  it('keeps verified doctors in the target specialty', () => {
    const { eligible, ineligibleCount } = eligibleCandidates(referral, [
      doctor({ id: 'doc-a', fullName: 'Dr. Amara Obi' }),
      doctor({ id: 'doc-b', fullName: 'Dr. Ben Cole', specialties: [DERMATOLOGY, CARDIOLOGY] }),
    ]);

    expect(ids(eligible)).toEqual(['doc-a', 'doc-b']);
    expect(ineligibleCount).toBe(0);
  });

  it.each(['pending', 'rejected'] as const)('drops %s doctors even when the backend returns them', (status) => {
    const { eligible, ineligibleCount } = eligibleCandidates(referral, [
      doctor({ id: 'doc-a', fullName: 'Dr. Amara Obi', verificationStatus: status }),
    ]);

    expect(eligible).toEqual([]);
    expect(ineligibleCount).toBe(1);
  });

  it('drops verified doctors outside the target specialty', () => {
    const { eligible, ineligibleCount } = eligibleCandidates(referral, [
      doctor({ id: 'doc-derm', fullName: 'Dr. Dana Reyes', specialties: [DERMATOLOGY] }),
      doctor({ id: 'doc-none', fullName: 'Dr. No Specialty', specialties: [] }),
    ]);

    expect(eligible).toEqual([]);
    expect(ineligibleCount).toBe(2);
  });

  it('never offers the doctor the referral is stuck with, or the referring doctor', () => {
    const { eligible, ineligibleCount } = eligibleCandidates(referral, [
      doctor({ id: 'doc-on-leave', fullName: 'Dr. Leo Vance' }),
      doctor({ id: 'doc-gp', fullName: 'Dr. Grace Park' }),
      doctor({ id: 'doc-a', fullName: 'Dr. Amara Obi' }),
    ]);

    expect(ids(eligible)).toEqual(['doc-a']);
    // They're eligible in principle, just not as a reassignment target.
    expect(ineligibleCount).toBe(0);
  });

  it('ignores duplicate rows', () => {
    const { eligible } = eligibleCandidates(referral, [
      doctor({ id: 'doc-a', fullName: 'Dr. Amara Obi' }),
      doctor({ id: 'doc-a', fullName: 'Dr. Amara Obi', verificationStatus: 'pending' }),
    ]);

    expect(ids(eligible)).toEqual(['doc-a']);
  });

  it('orders by soonest availability, then doctors with no open slots alphabetically', () => {
    const { eligible } = eligibleCandidates(referral, [
      doctor({ id: 'full-z', fullName: 'Dr. Zed', openSlotCount: 0, nextAvailableAt: null }),
      doctor({ id: 'later', fullName: 'Dr. Later', nextAvailableAt: '2026-10-22T09:00:00.000Z' }),
      doctor({ id: 'full-a', fullName: 'Dr. Abe', openSlotCount: 0, nextAvailableAt: null }),
      doctor({ id: 'sooner', fullName: 'Dr. Sooner', nextAvailableAt: '2026-10-19T09:00:00.000Z' }),
    ]);

    expect(ids(eligible)).toEqual(['sooner', 'later', 'full-a', 'full-z']);
  });

  it('handles an untargeted referral (no doctor assigned)', () => {
    const untargeted = { ...referral, targetDoctorId: null, targetDoctor: null, stuckReason: 'no_doctor' as const };
    const { eligible } = eligibleCandidates(untargeted, [doctor({ id: 'doc-a', fullName: 'Dr. Amara Obi' })]);

    expect(ids(eligible)).toEqual(['doc-a']);
  });
});

describe('chainDoctorIds', () => {
  it('collects referring and target doctors across the chain', () => {
    const looped: StuckReferral = {
      ...referral,
      stuckReason: 'loop_flagged',
      chain: [
        {
          referralId: 'ref-0',
          referringDoctor: { id: 'doc-gp', fullName: 'Dr. Grace Park' },
          targetSpecialty: CARDIOLOGY,
          targetDoctor: { id: 'doc-a', fullName: 'Dr. Amara Obi' },
          status: 'completed',
          createdAt: '2026-10-01T09:00:00.000Z',
        },
        {
          referralId: 'ref-1',
          referringDoctor: { id: 'doc-a', fullName: 'Dr. Amara Obi' },
          targetSpecialty: CARDIOLOGY,
          targetDoctor: null,
          status: 'pending',
          createdAt: '2026-10-14T09:00:00.000Z',
        },
      ],
    };

    expect([...chainDoctorIds(looped)].sort()).toEqual(['doc-a', 'doc-gp']);
    expect(chainDoctorIds(referral).size).toBe(0);
  });
});
