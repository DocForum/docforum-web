import type { DoctorAvailability, StuckReferral } from '../../types/models';

export interface CandidateList {
  /** Doctors the referral may be reassigned to, best availability first. */
  eligible: DoctorAvailability[];
  /** Returned by docforum-core but not verified in the target specialty. */
  ineligibleCount: number;
}

function isVerifiedIn(doctor: DoctorAvailability, specialtyId: string): boolean {
  return doctor.verificationStatus === 'verified' && doctor.specialties.some((s) => s.id === specialtyId);
}

// Soonest open slot first; doctors with nothing open in the window go last
// (still selectable — a referral waiting on a full diary beats one waiting
// on nobody), then alphabetical so the order is stable.
function byAvailability(a: DoctorAvailability, b: DoctorAvailability): number {
  const aOpen = a.openSlotCount > 0 && a.nextAvailableAt !== null;
  const bOpen = b.openSlotCount > 0 && b.nextAvailableAt !== null;
  if (aOpen !== bOpen) return aOpen ? -1 : 1;
  if (aOpen && bOpen && a.nextAvailableAt !== b.nextAvailableAt) {
    return Date.parse(a.nextAvailableAt!) - Date.parse(b.nextAvailableAt!);
  }
  return a.fullName.localeCompare(b.fullName);
}

/**
 * The only doctors the reassign picker may offer: verified, in the
 * referral's target specialty, and neither the doctor it's already stuck
 * with nor the doctor who referred. docforum-core is asked for exactly this
 * set, but it's re-checked here so a loose backend filter can never put an
 * unverified or off-specialty doctor in front of an admin.
 */
export function eligibleCandidates(referral: StuckReferral, doctors: DoctorAvailability[]): CandidateList {
  const excluded = new Set([referral.targetDoctorId, referral.referringDoctorId]);
  const seen = new Set<string>();
  const eligible: DoctorAvailability[] = [];
  let ineligibleCount = 0;

  for (const doctor of doctors) {
    if (seen.has(doctor.id)) continue;
    seen.add(doctor.id);

    if (!isVerifiedIn(doctor, referral.targetSpecialtyId)) {
      ineligibleCount += 1;
    } else if (!excluded.has(doctor.id)) {
      eligible.push(doctor);
    }
  }

  return { eligible: eligible.sort(byAvailability), ineligibleCount };
}

/** Doctors already somewhere in a flagged loop — reassigning to one of them
 * may just restart it, so the picker marks them. */
export function chainDoctorIds(referral: StuckReferral): Set<string> {
  const ids = new Set<string>();
  for (const link of referral.chain ?? []) {
    ids.add(link.referringDoctor.id);
    if (link.targetDoctor) ids.add(link.targetDoctor.id);
  }
  return ids;
}
