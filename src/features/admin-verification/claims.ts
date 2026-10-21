// Pure helpers for the per-specialty claims queue (issue #65): filters,
// age maths, and grouping flat claim rows by doctor.
import type { ClaimAge } from '../../services/admin-verification-service';
import type { Specialty, SpecialtyClaim } from '../../types/models';

export const CLAIM_AGES: { value: ClaimAge; label: string }[] = [
  { value: '24h', label: '1 day' },
  { value: '72h', label: '3 days' },
  { value: '168h', label: '7 days' },
];

export const ALL_SPECIALTIES = '';

export interface QueueFilters {
  /** `''` means every specialty. */
  specialtyId: string;
  /** `null` means any age — every pending claim counts, new ones included. */
  olderThan: ClaimAge | null;
}

function isClaimAge(value: string | null): value is ClaimAge {
  return value !== null && CLAIM_AGES.some((age) => age.value === value);
}

/** Anything unrecognised in a hand-edited link falls back to the default. */
export function parseQueueSearch(params: URLSearchParams): QueueFilters {
  const olderThan = params.get('olderThan');
  return {
    specialtyId: params.get('specialtyId')?.trim() ?? ALL_SPECIALTIES,
    olderThan: isClaimAge(olderThan) ? olderThan : null,
  };
}

/** Defaults are left out so the plain `/admin/verification` link stays canonical. */
export function toQueueSearch(filters: QueueFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.specialtyId) params.set('specialtyId', filters.specialtyId);
  if (filters.olderThan) params.set('olderThan', filters.olderThan);
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

/** Oldest claims first — the backend should already send them that way, but
 * the console promises "oldest first" across every page loaded so far. */
export function sortClaims(claims: SpecialtyClaim[]): SpecialtyClaim[] {
  return [...claims].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}

/** Flat per-pair rows as docforum-core sends them, grouped per doctor so an
 * admin reviews a doctor's claims together (the issue's grouping rule). A
 * doctor's rank is their *oldest* claim — longest-waiting first overall. */
export interface DoctorClaims {
  doctorId: string;
  doctorName: string;
  claims: SpecialtyClaim[];
  oldestClaimAt: string;
}

export function groupClaimsByDoctor(claims: SpecialtyClaim[]): DoctorClaims[] {
  const groups = new Map<string, DoctorClaims>();
  for (const claim of sortClaims(claims)) {
    const group = groups.get(claim.doctorId);
    if (group) group.claims.push(claim);
    else
      groups.set(claim.doctorId, {
        doctorId: claim.doctorId,
        doctorName: claim.doctor.fullName,
        claims: [claim],
        oldestClaimAt: claim.createdAt,
      });
  }
  return [...groups.values()].sort(
    (a, b) => Date.parse(a.oldestClaimAt) - Date.parse(b.oldestClaimAt),
  );
}

/** Specialty options for the filter dropdown: every specialty in the loaded
 * claims, plus the selected one (which a filter may have removed from the
 * page), deduplicated, alphabetical. */
export function specialtyOptions(claims: SpecialtyClaim[], selectedId: string): Specialty[] {
  const byId = new Map<string, Specialty>();
  for (const claim of claims) byId.set(claim.specialty.id, claim.specialty);
  const selected = byId.get(selectedId);
  if (selectedId && !selected) byId.set(selectedId, { id: selectedId, name: selectedId, slug: selectedId });
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
