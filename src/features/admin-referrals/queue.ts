import { englishTranslator } from '../../i18n/englishTranslator';
import type { Translator } from '../../i18n/useT';
import type { StuckAge } from '../../services/admin-referrals-service';
import type { ReferralChainLink, StuckReferral, StuckReferralReason } from '../../types/models';

export const STUCK_AGES: { value: StuckAge }[] = [
  { value: '24h' },
  { value: '48h' },
  { value: '72h' },
  { value: '168h' },
];

const STUCK_AGE_COPY: Record<StuckAge, string> = {
  '24h': '1 day',
  '48h': '2 days',
  '72h': '3 days',
  '168h': '7 days',
};

/** Age threshold label for the filter, in the active language. */
export function stuckAgeLabel(age: StuckAge, t: Translator = englishTranslator): string {
  return t(`adminReferrals.stuckAge.${age}`, STUCK_AGE_COPY[age]);
}

// docforum-core#68's own example threshold.
export const DEFAULT_AGE: StuckAge = '48h';

export const REASON_KEYS: StuckReferralReason[] = ['no_doctor', 'doctor_inactive', 'loop_flagged'];

const REASON_COPY: Record<StuckReferralReason, { label: string; description: string }> = {
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

export function reasonLabel(reason: StuckReferralReason, t: Translator = englishTranslator): string {
  return t(`adminReferrals.reason.${reason}.label`, REASON_COPY[reason].label);
}

export function reasonDescription(
  reason: StuckReferralReason,
  t: Translator = englishTranslator,
): string {
  return t(`adminReferrals.reason.${reason}.description`, REASON_COPY[reason].description);
}

export type ReasonFilter = StuckReferralReason | 'all';

export interface QueueFilters {
  olderThan: StuckAge;
  reason: ReasonFilter;
}

function isStuckAge(value: string | null): value is StuckAge {
  return STUCK_AGES.some((age) => age.value === value);
}

function isReason(value: string | null): value is StuckReferralReason {
  return value !== null && (REASON_KEYS as string[]).includes(value);
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

export function formatAge(hours: number, t: Translator = englishTranslator): string {
  if (hours < 1) return t('adminReferrals.age.underHour', 'under 1 h');
  if (hours < 48) return t('adminReferrals.age.hours', '{hours} h', { hours });
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  // Past a week the extra hours are noise.
  return days < 7 && rest > 0
    ? t('adminReferrals.age.daysHours', '{days} d {rest} h', { days, rest })
    : t('adminReferrals.age.days', '{days, plural, one {# day} other {# days}}', { days });
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
