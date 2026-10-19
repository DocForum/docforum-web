import { describe, expect, it } from 'vitest';
import { MAX_ALLOWLIST, applyUpdate, draftFromFlag, parsePercentage, parseUserIds, reviewDraft } from './draft';
import type { FeatureFlag } from '../../types/models';

const USER_A = '3f1c2a9e-1b2c-4d5e-8f90-123456789abc';
const USER_B = '7a8b9c0d-1e2f-4a5b-9c6d-abcdef012345';

const FLAG: FeatureFlag = {
  id: 'flag-1',
  key: 'wallet_payments',
  description: null,
  kind: 'percentage',
  enabled: true,
  rolloutPercentage: 10,
  targeting: { roles: ['patient'], userIds: [USER_A] },
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
};

describe('parsePercentage', () => {
  it.each(['0', '7', '100', ' 50 '])('accepts %s', (raw) => {
    expect(parsePercentage(raw)).toEqual({ value: Number(raw.trim()) });
  });

  it.each([
    ['', 'Enter a percentage from 0 to 100.'],
    ['-1', 'The rollout can’t be below 0%.'],
    ['101', 'The rollout can’t be above 100%.'],
    ['1000', 'The rollout can’t be above 100%.'],
    ['12.5', 'Use a whole number from 0 to 100.'],
    ['12,5', 'Use a whole number from 0 to 100.'],
    ['1e2', 'Enter a number from 0 to 100.'],
    ['fifty', 'Enter a number from 0 to 100.'],
  ])('rejects %j', (raw, error) => {
    expect(parsePercentage(raw)).toEqual({ error });
  });
});

describe('parseUserIds', () => {
  it('splits on commas, spaces and new lines, lower-cases and de-duplicates', () => {
    expect(parseUserIds(`${USER_A.toUpperCase()},\n${USER_B}  ${USER_A}`)).toEqual({ ids: [USER_A, USER_B] });
    expect(parseUserIds('  ')).toEqual({ ids: [] });
  });

  it('refuses anything that is not a user id instead of dropping it', () => {
    const result = parseUserIds(`${USER_A}\njane@example.com`);
    expect(result).toEqual({ error: expect.stringContaining('“jane@example.com”') });
  });

  it('lets ids already saved on the flag through untouched', () => {
    expect(parseUserIds('legacy-id-42', ['legacy-id-42'])).toEqual({ ids: ['legacy-id-42'] });
  });

  it('caps the allowlist', () => {
    const ids = Array.from({ length: MAX_ALLOWLIST + 1 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`);
    expect(parseUserIds(ids.join('\n'))).toEqual({ error: expect.stringContaining(`at most ${MAX_ALLOWLIST}`) });
  });
});

describe('reviewDraft', () => {
  it('reports no changes for an untouched draft', () => {
    const review = reviewDraft(FLAG, draftFromFlag(FLAG));
    expect(review).toMatchObject({ ok: true, changes: [] });
  });

  it('sends only what changed, with the version the admin saw', () => {
    const review = reviewDraft(FLAG, { ...draftFromFlag(FLAG), rolloutPercentage: '50' });
    expect(review.ok && review.input).toEqual({ rolloutPercentage: 50, expectedUpdatedAt: FLAG.updatedAt });
    expect(review.ok && review.changes).toEqual([
      { field: 'rolloutPercentage', label: 'Rollout', before: '10%', after: '50%' },
    ]);
  });

  it('sends targeting whole when either half changes, and describes the allowlist delta', () => {
    const review = reviewDraft(FLAG, { ...draftFromFlag(FLAG), roles: ['doctor', 'patient'], userIds: USER_B });
    if (!review.ok) throw new Error('expected a valid draft');
    expect(review.input.targeting).toEqual({ roles: ['patient', 'doctor'], userIds: [USER_B] });
    expect(review.changes.map((change) => change.field)).toEqual(['roles', 'userIds']);
    expect(review.changes[1]).toMatchObject({ before: '1 user', after: '1 user', detail: 'Adds 7a8b9c0d… · Removes 3f1c2a9e…' });
  });

  it('ignores role order and allowlist order', () => {
    const flag: FeatureFlag = { ...FLAG, targeting: { roles: ['doctor', 'patient'], userIds: [USER_A, USER_B] } };
    const review = reviewDraft(flag, { ...draftFromFlag(flag), roles: ['patient', 'doctor'], userIds: `${USER_B}\n${USER_A}` });
    expect(review).toMatchObject({ ok: true, changes: [] });
  });

  it('collects every field error at once', () => {
    expect(reviewDraft(FLAG, { ...draftFromFlag(FLAG), rolloutPercentage: '150', userIds: 'nope' })).toEqual({
      ok: false,
      errors: { rolloutPercentage: 'The rollout can’t be above 100%.', userIds: expect.any(String) },
    });
  });

  it('never validates a percentage on a boolean flag', () => {
    const flag: FeatureFlag = { ...FLAG, kind: 'boolean', rolloutPercentage: null };
    const review = reviewDraft(flag, { ...draftFromFlag(flag), enabled: false });
    expect(review.ok && review.input).toEqual({ enabled: false, expectedUpdatedAt: FLAG.updatedAt });
  });
});

describe('applyUpdate', () => {
  it('applies the change but leaves updatedAt for the server to move', () => {
    const next = applyUpdate(FLAG, { enabled: false, expectedUpdatedAt: FLAG.updatedAt });
    expect(next).toEqual({ ...FLAG, enabled: false });
    expect(next.updatedAt).toBe(FLAG.updatedAt);
  });
});
