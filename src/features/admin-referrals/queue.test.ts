import { describe, expect, it } from 'vitest';
import { ageTone, formatAge, hoursSince, loopReturnIndexes, parseQueueSearch, toQueueSearch } from './queue';
import { normaliseReason, validateReason } from './reason';
import { describeActionError } from './errors';
import { ApiError } from '../../services/api-client';
import type { ReferralChainLink } from '../../types/models';

describe('queue URL filters', () => {
  it('defaults to 48h and every reason', () => {
    expect(parseQueueSearch(new URLSearchParams())).toEqual({ olderThan: '48h', reason: 'all' });
  });

  it('reads known values', () => {
    expect(parseQueueSearch(new URLSearchParams('olderThan=168h&reason=loop_flagged'))).toEqual({
      olderThan: '168h',
      reason: 'loop_flagged',
    });
  });

  it('falls back on anything unrecognised in a hand-edited link', () => {
    expect(parseQueueSearch(new URLSearchParams('olderThan=1y&reason=toString'))).toEqual({
      olderThan: '48h',
      reason: 'all',
    });
  });

  it('leaves defaults out of the URL', () => {
    expect(toQueueSearch({ olderThan: '48h', reason: 'all' }).toString()).toBe('');
    expect(toQueueSearch({ olderThan: '72h', reason: 'no_doctor' }).toString()).toBe('olderThan=72h&reason=no_doctor');
  });
});

describe('referral age', () => {
  const now = Date.parse('2026-10-18T12:00:00.000Z');

  it('counts whole hours and rejects unparseable dates', () => {
    expect(hoursSince('2026-10-16T11:30:00.000Z', now)).toBe(48);
    expect(hoursSince('not a date', now)).toBeNull();
    // Clock skew shouldn't produce a negative age.
    expect(hoursSince('2026-10-18T12:05:00.000Z', now)).toBe(0);
  });

  it.each([
    [0, 'under 1 h'],
    [47, '47 h'],
    [48, '2 days'],
    [76, '3 d 4 h'],
    [170, '7 days'],
  ])('formats %i hours as "%s"', (hours, label) => {
    expect(formatAge(hours)).toBe(label);
  });

  it('escalates the tone at 3 and 7 days', () => {
    expect(ageTone(71)).toBe('elevated');
    expect(ageTone(72)).toBe('high');
    expect(ageTone(168)).toBe('critical');
  });
});

describe('loopReturnIndexes', () => {
  const gp = { id: 'doc-gp', fullName: 'Dr. Grace Park' };
  const cardio = { id: 'spec-cardio', name: 'Cardiology', slug: 'cardiology' };
  const neuro = { id: 'spec-neuro', name: 'Neurology', slug: 'neurology' };
  const amara = { id: 'doc-a', fullName: 'Dr. Amara Obi' };
  const link = (overrides: Partial<ReferralChainLink>): ReferralChainLink => ({
    referralId: 'ref',
    referringDoctor: gp,
    targetSpecialty: cardio,
    targetDoctor: null,
    status: 'completed',
    createdAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  });

  it('marks the hop that returns to an earlier specialty', () => {
    const chain = [
      link({ referralId: 'r1', targetSpecialty: cardio, targetDoctor: amara }),
      link({ referralId: 'r2', referringDoctor: amara, targetSpecialty: neuro }),
      link({ referralId: 'r3', referringDoctor: amara, targetSpecialty: cardio }),
    ];
    expect([...loopReturnIndexes(chain)]).toEqual([2]);
  });

  it('marks the hop that sends the patient back to an earlier doctor', () => {
    const chain = [
      link({ referralId: 'r1', targetSpecialty: cardio, targetDoctor: amara }),
      link({ referralId: 'r2', referringDoctor: amara, targetSpecialty: neuro, targetDoctor: gp }),
    ];
    expect([...loopReturnIndexes(chain)]).toEqual([1]);
  });

  it('finds nothing in a straight chain', () => {
    expect(loopReturnIndexes([link({ referralId: 'r1' })]).size).toBe(0);
  });
});

describe('action reasons', () => {
  it('requires a meaningful, bounded reason', () => {
    expect(validateReason('   ')).toMatch(/Give a reason/);
    expect(validateReason('too short')).toMatch(/at least 10/);
    expect(validateReason('x'.repeat(501))).toMatch(/under 500/);
    expect(validateReason('Specialist on extended leave')).toBeNull();
  });

  it('collapses whitespace before sending', () => {
    expect(normaliseReason('  Doctor on\n\n leave   until Nov ')).toBe('Doctor on leave until Nov');
  });
});

describe('describeActionError', () => {
  it.each([409, 404])('treats %i as someone else having acted', (status) => {
    expect(describeActionError(new ApiError('Conflict', status), 'reassign').kind).toBe('conflict');
  });

  it('surfaces the server message for a refused request', () => {
    const outcome = describeActionError(new ApiError('Doctor is not verified in Cardiology', 422), 'reassign');
    expect(outcome).toEqual({
      kind: 'rejected',
      message: 'docforum-core refused the reassignment: Doctor is not verified in Cardiology',
    });
  });

  it('never claims success or failure when the request went unanswered', () => {
    const outcome = describeActionError(new TypeError('Failed to fetch'), 'cancel');
    expect(outcome.kind).toBe('unconfirmed');
    expect(outcome.message).toMatch(/Couldn't confirm the cancellation/);
  });
});
