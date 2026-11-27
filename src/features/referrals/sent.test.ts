import { describe, expect, it } from 'vitest';
import { isExpiredAndNotified, needsAttention, shortId, sortSentReferrals } from './sent';
import type { SentReferral } from '../../types/models';

function make(id: string, overrides: Partial<SentReferral> = {}): SentReferral {
  return {
    id,
    status: 'accepted',
    targetDoctorId: 'doc-1',
    targetSpecialtyId: null,
    referringDoctorNotifiedAt: null,
    loopFlaggedAt: null,
    loopFlagReason: null,
    noShowCount: 0,
    expiredAt: null,
    expiredReason: null,
    resultingAppointmentId: null,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('sent referral helpers', () => {
  it('treats only an expired referral with a notification as expired-and-notified', () => {
    expect(isExpiredAndNotified(make('a', { status: 'expired', referringDoctorNotifiedAt: '2026-11-02T00:00:00.000Z' }))).toBe(true);
    expect(isExpiredAndNotified(make('b', { status: 'expired' }))).toBe(false);
    expect(isExpiredAndNotified(make('c', { status: 'accepted', referringDoctorNotifiedAt: '2026-11-02T00:00:00.000Z' }))).toBe(false);
  });

  it('needs attention when pending, loop-flagged, or expired-and-notified', () => {
    expect(needsAttention(make('pending', { status: 'pending' }))).toBe(true);
    expect(needsAttention(make('loop', { status: 'completed', loopFlaggedAt: '2026-11-02T00:00:00.000Z' }))).toBe(true);
    expect(needsAttention(make('expired', { status: 'expired', referringDoctorNotifiedAt: '2026-11-02T00:00:00.000Z' }))).toBe(true);
    expect(needsAttention(make('done', { status: 'completed' }))).toBe(false);
  });

  it('sorts attention-needing rows before settled rows, newest first within each group', () => {
    const sorted = sortSentReferrals([
      make('settled-new', { status: 'accepted', createdAt: '2026-11-10T00:00:00.000Z' }),
      make('pending-old', { status: 'pending', createdAt: '2026-11-02T00:00:00.000Z' }),
      make('pending-new', { status: 'pending', createdAt: '2026-11-09T00:00:00.000Z' }),
      make('settled-old', { status: 'completed', createdAt: '2026-11-01T00:00:00.000Z' }),
    ]);
    expect(sorted.map((item) => item.id)).toEqual(['pending-new', 'pending-old', 'settled-new', 'settled-old']);
  });

  it('shortens long target ids without changing short ones', () => {
    expect(shortId('12345678')).toBe('12345678');
    expect(shortId('123456789abcdef')).toBe('12345678…');
  });
});
