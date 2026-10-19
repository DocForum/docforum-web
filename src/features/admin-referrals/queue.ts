import type { StuckAge } from '../../services/admin-referrals-service';
import type { ReferralChainLink, StuckReferral, StuckReferralReason } from '../../types/models';

export const STUCK_AGES: { value: StuckAge; label: string }[] = [
  { value: '24h', label: '1 day' },
  { value: '48h', label: '2 days' },
  { value: '72h', label: '3 days' },
  { value: '168h', label: '7 days' },
];

// docforum-core#68's own example threshold.
export const DEFAULT_AGE: StuckAge = '48h';

export const REASONS: Record<StuckReferralReason, { label: string; description: string }> = {
  no_doctor: {
    label: 'No doctor',
    description: 'Routing found no available doctor in the target specialty.',
  },
  doctor_inactive: {
    label: 'Doctor inactive',
    description: "The assigned doctor isn't taking referrals (on leave or deactivated).",
  },
  loop_flagged: {
    label: 'Loop flagged',
    description: 'This referral returns to a doctor or specialty already in its chain.',
  },
};

export type ReasonFilter = StuckReferralReason | 'all';

export interface QueueFilters {
  olderThan: StuckAge;
  reason: ReasonFilter;
}

function isStuckAge(value: string | null): value is StuckAge {
  return STUCK_AGES.some((age) => age.value === value);
}

function isReason(value: string | null): value is StuckReferralReason {
  return value !== null && Object.hasOwn(REASONS, value);
}

/** Anything unrecognised in a hand-edited link falls back to the default. */
export function parseQueueSearch(params: URLSearchParams): QueueFilters {
  const olderThan = params.get('olderThan');
  const reason = params.get('reason');
  return {
    olderThan: isStuckAge(olderThan) ? olderThan : DEFAULT_AGE,
    reason: isReason(reason) ? reason : 'all',
  };
}

/** Defaults are left out so the plain `/admin/referrals` link stays canonical. */
export function toQueueSearch(filters: QueueFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.olderThan !== DEFAULT_AGE) params.set('olderThan', filters.olderThan);
  if (filters.reason !== 'all') params.set('reason', filters.reason);
  return params;
}

const HOUR_MS = 60 * 60 * 1000;

/** Whole hours since `since`, or null for an unparseable timestamp. */
export function hoursSince(since: string, now: number): number | null {
  const start = Date.parse(since);
  if (Number.isNaN(start)) return null;
  return Math.max(0, Math.floor((now - start) / HOUR_MS));
}

export function formatAge(hours: number): string {
  if (hours < 1) return 'under 1 h';
  if (hours < 48) return `${hours} h`;
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  // Past a week the extra hours are noise.
  return days < 7 && rest > 0 ? `${days} d ${rest} h` : `${days} days`;
}

export type AgeTone = 'elevated' | 'high' | 'critical';

export function ageTone(hours: number): AgeTone {
  if (hours >= 168) return 'critical';
  if (hours >= 72) return 'high';
  return 'elevated';
}

/** Oldest first — the backend should already send them that way, but the
 * console promises "by age" across every page loaded so far. */
export function sortByAge(referrals: StuckReferral[]): StuckReferral[] {
  return [...referrals].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}

/**
 * Indexes of chain links that go back to a doctor or specialty an earlier
 * link already went to — the point where the loop closes.
 */
export function loopReturnIndexes(chain: ReferralChainLink[]): Set<number> {
  const doctors = new Set<string>();
  const specialties = new Set<string>();
  const returns = new Set<number>();

  chain.forEach((link, index) => {
    const doctorId = link.targetDoctor?.id;
    if (specialties.has(link.targetSpecialty.id) || (doctorId && doctors.has(doctorId))) returns.add(index);
    specialties.add(link.targetSpecialty.id);
    doctors.add(link.referringDoctor.id);
    if (doctorId) doctors.add(doctorId);
  });

  return returns;
}
