import { describe, expect, it } from 'vitest';
import {
  CLAIM_AGES,
  formatAge,
  formatBytes,
  groupClaimsByDoctor,
  hoursSince,
  parseQueueSearch,
  sortClaims,
  specialtyOptions,
  toQueueSearch,
} from './claims';
import type { SpecialtyClaim } from '../../types/models';

const HOUR = 60 * 60 * 1000;
const hoursAgo = (hours: number) => new Date(Date.now() - hours * HOUR).toISOString();

function claim(overrides: Partial<SpecialtyClaim> & Pick<SpecialtyClaim, 'id' | 'doctorId' | 'createdAt'>): SpecialtyClaim {
  return {
    doctor: { id: overrides.doctorId, fullName: `Dr. ${overrides.doctorId}` },
    specialtyId: 'spec-cardio',
    specialty: { id: 'spec-cardio', name: 'Cardiology', slug: 'cardiology' },
    status: 'pending',
    credential: null,
    rejectionReason: null,
    reviewedById: null,
    reviewedByName: null,
    reviewedAt: null,
    updatedAt: overrides.createdAt,
    ...overrides,
  };
}

describe('parseQueueSearch / toQueueSearch', () => {
  it('defaults to every specialty and any age', () => {
    expect(parseQueueSearch(new URLSearchParams())).toEqual({ specialtyId: '', olderThan: null });
  });

  it('round-trips non-default filters', () => {
    const params = toQueueSearch({ specialtyId: 'spec-neuro', olderThan: '72h' });
    expect(params.toString()).toBe('specialtyId=spec-neuro&olderThan=72h');
    expect(parseQueueSearch(params)).toEqual({ specialtyId: 'spec-neuro', olderThan: '72h' });
  });

  it('drops unrecognised ages from hand-edited links', () => {
    expect(parseQueueSearch(new URLSearchParams('olderThan=9999h&specialtyId=spec-x'))).toEqual({
      specialtyId: 'spec-x',
      olderThan: null,
    });
    expect(CLAIM_AGES.map((a) => a.value)).toEqual(['24h', '72h', '168h']);
  });

  it('leaves defaults out of the URL', () => {
    expect(toQueueSearch({ specialtyId: '', olderThan: null }).toString()).toBe('');
  });
});

describe('hoursSince / formatAge', () => {
  it('counts whole hours and never goes negative', () => {
    expect(hoursSince(hoursAgo(5), Date.now())).toBe(5);
    expect(hoursSince(hoursAgo(-2), Date.now())).toBe(0);
    expect(hoursSince('not a date', Date.now())).toBeNull();
  });

  it('formats hours, days and the day+hour mix', () => {
    expect(formatAge(0)).toBe('under 1 h');
    expect(formatAge(30)).toBe('30 h');
    expect(formatAge(52)).toBe('2 d 4 h');
    expect(formatAge(170)).toBe('7 days');
    expect(formatAge(190)).toBe('7 days'); // past a week the hours are noise
  });
});

describe('groupClaimsByDoctor', () => {
  it('groups flat claims per doctor, claims oldest first, doctors by oldest claim', () => {
    const groups = groupClaimsByDoctor([
      claim({ id: 'c-young', doctorId: 'doc-a', createdAt: hoursAgo(2) }),
      claim({ id: 'c-old-b', doctorId: 'doc-b', createdAt: hoursAgo(100) }),
      claim({ id: 'c-old-a', doctorId: 'doc-a', createdAt: hoursAgo(50) }),
      claim({
        id: 'c-other-spec',
        doctorId: 'doc-b',
        createdAt: hoursAgo(30),
        specialtyId: 'spec-derm',
        specialty: { id: 'spec-derm', name: 'Dermatology', slug: 'dermatology' },
      }),
    ]);

    expect(groups.map((g) => g.doctorId)).toEqual(['doc-b', 'doc-a']);
    expect(groups[0].claims.map((c) => c.id)).toEqual(['c-old-b', 'c-other-spec']);
    expect(groups[1].claims.map((c) => c.id)).toEqual(['c-old-a', 'c-young']);
    expect(groups[0].oldestClaimAt).toBe(groups[0].claims[0].createdAt);
  });

  it('returns nothing for an empty queue', () => {
    expect(groupClaimsByDoctor([])).toEqual([]);
  });
});

describe('specialtyOptions', () => {
  const cardiology = claim({ id: 'c1', doctorId: 'd1', createdAt: hoursAgo(1) });
  const derm = claim({
    id: 'c2',
    doctorId: 'd2',
    createdAt: hoursAgo(1),
    specialtyId: 'spec-derm',
    specialty: { id: 'spec-derm', name: 'Dermatology', slug: 'dermatology' },
  });

  it('deduplicates and sorts specialties from the loaded claims', () => {
    const options = specialtyOptions([cardiology, derm, cardiology], '');
    expect(options.map((s) => s.id)).toEqual(['spec-cardio', 'spec-derm']);
  });

  it('keeps the selected specialty visible even when a filter removed it from the page', () => {
    const options = specialtyOptions([derm], 'spec-cardio');
    expect(options.map((s) => s.id)).toContain('spec-cardio');
  });
});

describe('sortClaims', () => {
  it('sorts oldest first without mutating the input', () => {
    const input = [
      claim({ id: 'new', doctorId: 'd', createdAt: hoursAgo(1) }),
      claim({ id: 'old', doctorId: 'd', createdAt: hoursAgo(48) }),
    ];
    const sorted = sortClaims(input);
    expect(sorted.map((c) => c.id)).toEqual(['old', 'new']);
    expect(input.map((c) => c.id)).toEqual(['new', 'old']);
  });
});

describe('formatBytes', () => {
  it('formats bytes, kilobytes and megabytes', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(245_760)).toBe('240 KB');
    expect(formatBytes(1_843_200)).toBe('1.8 MB');
  });
});
