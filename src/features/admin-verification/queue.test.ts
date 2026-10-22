import { describe, expect, it } from 'vitest';
import { ageTone, hoursSince, oldestAgeLabel, sortBySubmitted, statusLabel, toDecision } from './queue';
import type { VerificationQueueItem } from '../../types/models';

function item(id: string, submittedAt: string): VerificationQueueItem {
  return {
    doctorProfileId: id,
    fullName: `Dr ${id}`,
    specialties: ['Cardiology'],
    submittedAt,
    documentCount: 2,
    verificationStatus: 'pending',
  };
}

const NOW = Date.parse('2026-10-20T12:00:00.000Z');

describe('hoursSince', () => {
  it('floors whole hours and never goes negative', () => {
    expect(hoursSince('2026-10-19T10:30:00.000Z', NOW)).toBe(25);
    expect(hoursSince('2026-10-21T10:00:00.000Z', NOW)).toBe(0);
    expect(hoursSince('not a date', NOW)).toBeNull();
  });
});

describe('ageTone', () => {
  it('escalates at three days and a week — verification gates supply', () => {
    expect(ageTone(1)).toBe('fresh');
    expect(ageTone(71)).toBe('fresh');
    expect(ageTone(72)).toBe('elevated');
    expect(ageTone(167)).toBe('elevated');
    expect(ageTone(168)).toBe('critical');
  });
});

describe('sortBySubmitted', () => {
  it('puts the oldest application first, regardless of server order', () => {
    const sorted = sortBySubmitted([
      item('newest', '2026-10-20T08:00:00.000Z'),
      item('oldest', '2026-10-12T08:00:00.000Z'),
      item('middle', '2026-10-16T08:00:00.000Z'),
    ]);
    expect(sorted.map((entry) => entry.doctorProfileId)).toEqual(['oldest', 'middle', 'newest']);
  });

  it('does not mutate the input and survives unparseable timestamps', () => {
    const input = [item('a', 'garbage'), item('b', '2026-10-16T08:00:00.000Z')];
    const sorted = sortBySubmitted(input);
    expect(sorted[0].doctorProfileId).toBe('b');
    expect(input[0].doctorProfileId).toBe('a');
  });
});

describe('oldestAgeLabel', () => {
  it('summarises how long the oldest doctor has waited', () => {
    expect(oldestAgeLabel([], NOW)).toBeNull();
    expect(oldestAgeLabel([item('x', '2026-10-20T11:30:00.000Z')], NOW)).toBe('Waiting less than an hour');
    expect(oldestAgeLabel([item('x', '2026-10-19T11:00:00.000Z')], NOW)).toBe('25h waiting');
    expect(oldestAgeLabel([item('x', '2026-10-10T11:00:00.000Z')], NOW)).toBe('10 days waiting');
  });
});

describe('statusLabel', () => {
  it('uses words, not enum tokens', () => {
    expect(statusLabel('pending')).toBe('Pending review');
    expect(statusLabel('verified')).toBe('Verified');
    expect(statusLabel('rejected')).toBe('Rejected');
  });
});

describe('toDecision — decision history projection', () => {
  const base = {
    id: 'evt-1',
    action: 'doctor.verification_status_changed',
    fromState: 'pending' as string | null,
    toState: 'verified' as string | null,
    actorUserId: 'admin-1',
    createdAt: '2026-10-20T10:00:00.000Z',
  };

  it('projects a verification change into a history row', () => {
    expect(toDecision(base)).toEqual({
      id: 'evt-1',
      at: '2026-10-20T10:00:00.000Z',
      from: 'pending',
      to: 'verified',
      actorUserId: 'admin-1',
    });
  });

  it('keeps the first-ever flip (null fromState)', () => {
    expect(toDecision({ ...base, fromState: null })?.from).toBeNull();
  });

  it('ignores unrelated actions and non-status states', () => {
    expect(toDecision({ ...base, action: 'doctor.profile_updated' })).toBeNull();
    expect(toDecision({ ...base, toState: 'something_else' })).toBeNull();
    expect(toDecision({ ...base, toState: null })).toBeNull();
  });
});
