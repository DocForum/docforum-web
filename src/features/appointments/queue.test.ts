import { describe, expect, it } from 'vitest';
import { canCheckIn, notificationBody, queueSignature, shouldNotify } from './queue';
import type { AppointmentQueue } from '../../types/models';

const NOW = new Date('2026-10-16T10:00:00Z');

function queue(overrides: Partial<AppointmentQueue> = {}): AppointmentQueue {
  return {
    appointmentId: 'apt-1',
    phase: 'not_open',
    peopleAhead: null,
    estimatedWaitMinutes: null,
    checkInOpensAt: '2026-10-16T09:00:00Z',
    checkedInAt: null,
    ...overrides,
  };
}

describe('canCheckIn', () => {
  it('offers the button once the window has opened', () => {
    expect(canCheckIn(queue({ checkInOpensAt: '2026-10-16T09:59:00Z' }), NOW)).toBe(true);
  });

  it('withholds it before the window opens', () => {
    expect(canCheckIn(queue({ checkInOpensAt: '2026-10-16T10:01:00Z' }), NOW)).toBe(false);
  });

  it('offers it when the backend publishes no window at all', () => {
    expect(canCheckIn(queue({ checkInOpensAt: null }), NOW)).toBe(true);
  });

  it('never offers it twice, nor for a finished visit', () => {
    expect(canCheckIn(queue({ phase: 'waiting', checkedInAt: '2026-10-16T09:30:00Z' }), NOW)).toBe(false);
    expect(canCheckIn(queue({ phase: 'completed', checkedInAt: '2026-10-16T09:30:00Z' }), NOW)).toBe(false);
    expect(canCheckIn(queue({ phase: 'being_seen', checkedInAt: '2026-10-16T09:30:00Z' }), NOW)).toBe(false);
  });
});

describe('shouldNotify', () => {
  it('alerts at two ahead and below, not at three', () => {
    const waiting = { phase: 'waiting' as const, checkedInAt: '2026-10-16T09:30:00Z' };
    expect(shouldNotify(queue({ ...waiting, peopleAhead: 2 }))).toBe(true);
    expect(shouldNotify(queue({ ...waiting, peopleAhead: 1 }))).toBe(true);
    expect(shouldNotify(queue({ ...waiting, peopleAhead: 3 }))).toBe(false);
  });

  it('treats an unpublished position as nothing to alert about', () => {
    expect(shouldNotify(queue({ phase: 'waiting', peopleAhead: null, checkedInAt: 'x' }))).toBe(false);
  });

  it("alerts the moment it is the patient's turn", () => {
    expect(shouldNotify(queue({ phase: 'being_seen', peopleAhead: 7, checkedInAt: 'x' }))).toBe(true);
  });

  it('does not alert before check-in is even possible', () => {
    expect(shouldNotify(queue({ phase: 'not_open', peopleAhead: 0 }))).toBe(false);
    expect(shouldNotify(queue({ phase: 'completed', peopleAhead: 0 }))).toBe(false);
  });
});

describe('queueSignature', () => {
  it('is stable for an unchanged queue and changes with the position', () => {
    const waiting = queue({ phase: 'waiting', peopleAhead: 3, checkedInAt: 'x' });
    expect(queueSignature(waiting)).toBe(queueSignature({ ...waiting }));
    expect(queueSignature(waiting)).not.toBe(queueSignature({ ...waiting, peopleAhead: 2 }));
    expect(queueSignature(waiting)).not.toBe(queueSignature({ ...waiting, phase: 'being_seen' }));
  });

  it('keeps an unpublished position distinct from zero ahead', () => {
    expect(queueSignature(queue({ peopleAhead: null }))).not.toBe(queueSignature(queue({ peopleAhead: 0 })));
  });
});

describe('notificationBody', () => {
  it('labels the wait as an estimate', () => {
    expect(notificationBody(queue({ phase: 'waiting', peopleAhead: 2, estimatedWaitMinutes: 12 }))).toBe(
      'Only 2 ahead of you — about 12 min (estimate).',
    );
  });

  it('omits an estimate that does not exist', () => {
    expect(notificationBody(queue({ phase: 'waiting', peopleAhead: 1 }))).toBe('Only 1 ahead of you.');
  });

  it('says it is your turn', () => {
    expect(notificationBody(queue({ phase: 'being_seen' }))).toBe('It is your turn now.');
  });
});
