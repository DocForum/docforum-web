import { describe, expect, it } from 'vitest';
import {
  countByState,
  describeAudience,
  filterFlags,
  flagState,
  latestChangeByFlag,
  matchesQuery,
  parseFlagSearch,
  toFlagSearch,
} from './flags';
import type { AuditEvent, FeatureFlag } from '../../types/models';

const BASE: FeatureFlag = {
  id: 'flag-1',
  key: 'wallet_payments',
  description: 'Let patients pay from a linked Stellar wallet',
  kind: 'percentage',
  enabled: true,
  rolloutPercentage: 25,
  targeting: { roles: [], userIds: [] },
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
};

const flag = (patch: Partial<FeatureFlag>): FeatureFlag => ({ ...BASE, ...patch });

function event(patch: Partial<AuditEvent>): AuditEvent {
  return {
    id: 'evt',
    actorUserId: 'admin-1',
    actorRole: 'admin',
    entityType: 'FeatureFlag',
    entityId: 'flag-1',
    action: 'feature_flag.updated',
    fromState: null,
    toState: null,
    requestId: null,
    metadata: null,
    createdAt: '2026-10-01T00:00:00.000Z',
    ...patch,
  };
}

describe('flagState', () => {
  it('is off whenever the kill switch is off, whatever the percentage', () => {
    expect(flagState(flag({ enabled: false, rolloutPercentage: 100 }))).toBe('off');
  });

  it('is rolling out below 100% and on at 100%', () => {
    expect(flagState(flag({ rolloutPercentage: 0 }))).toBe('rollout');
    expect(flagState(flag({ rolloutPercentage: 99 }))).toBe('rollout');
    expect(flagState(flag({ rolloutPercentage: 100 }))).toBe('on');
  });

  it('treats an enabled boolean flag as on', () => {
    expect(flagState(flag({ kind: 'boolean', rolloutPercentage: null }))).toBe('on');
  });
});

describe('describeAudience', () => {
  it('names the targeted roles and the percentage', () => {
    expect(describeAudience(flag({ targeting: { roles: ['doctor', 'patient'], userIds: [] } }))).toBe(
      'On for 25% of patients and doctors.',
    );
  });

  it('adds the allowlist, which bypasses roles and percentage', () => {
    expect(describeAudience(flag({ targeting: { roles: [], userIds: ['a', 'b'] } }))).toBe(
      'On for 25% of everyone, plus 2 allowlisted users.',
    );
  });

  it('spells out the edge cases at 0% and when disabled', () => {
    expect(describeAudience(flag({ rolloutPercentage: 0 }))).toBe('Enabled, but at 0% nobody gets it.');
    expect(describeAudience(flag({ rolloutPercentage: 0, targeting: { roles: [], userIds: ['a'] } }))).toBe(
      'On only for 1 allowlisted user.',
    );
    expect(describeAudience(flag({ enabled: false, targeting: { roles: [], userIds: ['a'] } }))).toBe(
      'Off for everyone, allowlisted users included.',
    );
  });

  it('drops the percentage for boolean flags and at 100%', () => {
    expect(describeAudience(flag({ kind: 'boolean', rolloutPercentage: null }))).toBe('On for everyone.');
    expect(describeAudience(flag({ rolloutPercentage: 100, targeting: { roles: ['facility'], userIds: [] } }))).toBe(
      'On for facility staff.',
    );
  });
});

describe('URL filters', () => {
  it('round-trips, leaving defaults out', () => {
    const filters = { query: 'wallet', state: 'rollout', kind: 'percentage' } as const;
    expect(parseFlagSearch(toFlagSearch(filters))).toEqual(filters);
    expect(toFlagSearch({ query: '  ', state: 'all', kind: 'all' }).toString()).toBe('');
  });

  it('falls back on values it does not recognise and caps the search text', () => {
    const parsed = parseFlagSearch(new URLSearchParams({ state: 'broken', kind: '<script>', q: 'x'.repeat(500) }));
    expect(parsed.state).toBe('all');
    expect(parsed.kind).toBe('all');
    expect(parsed.query).toHaveLength(100);
  });
});

describe('search and filtering', () => {
  it('matches key and description, case-insensitively, with _ and spaces interchangeable', () => {
    expect(matchesQuery(BASE, 'Wallet Pay')).toBe(true);
    expect(matchesQuery(BASE, 'stellar')).toBe(true);
    expect(matchesQuery(BASE, '2fa')).toBe(false);
    expect(matchesQuery(flag({ description: null }), 'wallet')).toBe(true);
  });

  it('sorts by key and counts states within the narrowed set', () => {
    const flags = [
      flag({ key: 'two_factor', kind: 'boolean', rolloutPercentage: null, enabled: false, description: null }),
      flag({ key: 'sms_channel', kind: 'boolean', rolloutPercentage: null, description: null }),
      BASE,
    ];
    const narrowed = filterFlags(flags, { query: '', kind: 'boolean' });
    expect(narrowed.map((f) => f.key)).toEqual(['sms_channel', 'two_factor']);
    expect(countByState(narrowed)).toEqual({ all: 2, on: 1, rollout: 0, off: 1 });
  });
});

describe('latestChangeByFlag', () => {
  it('keeps the newest event per flag by timestamp, ignoring other entity types', () => {
    const latest = latestChangeByFlag([
      event({ id: 'old', createdAt: '2026-10-01T00:00:00.000Z' }),
      event({ id: 'new', createdAt: '2026-10-05T00:00:00.000Z' }),
      event({ id: 'other', entityId: 'flag-2' }),
      event({ id: 'not-a-flag', entityType: 'Referral', entityId: 'flag-1', createdAt: '2026-10-09T00:00:00.000Z' }),
    ]);
    expect(latest.get('flag-1')?.id).toBe('new');
    expect(latest.get('flag-2')?.id).toBe('other');
  });
});
