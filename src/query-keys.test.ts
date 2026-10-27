import { describe, expect, it } from 'vitest';
import {
  accountKeys,
  appointmentKeys,
  calendarKeys,
  careThreadKeys,
  dependentKeys,
  facilityKeys,
  facilitySearchKeys,
  flagKeys,
  healthKeys,
  messageKeys,
  patientChartKeys,
  paymentKeys,
  queueKeys,
  referralKeys,
  resultKeys,
  systemKeys,
  auditKeys,
  consultationKeys,
  insightKeys,
} from './query-keys';
import type { QueryKey } from '@tanstack/react-query';

function hasPrefix(key: QueryKey, prefix: readonly unknown[]): boolean {
  return prefix.every((part, index) => JSON.stringify(key[index]) === JSON.stringify(part));
}

describe('query key factories', () => {
  it('nests every key under its resource root', () => {
    const roots: Array<[QueryKey, QueryKey]> = [
      [appointmentKeys.today(), appointmentKeys.all],
      [appointmentKeys.list('pp-1'), appointmentKeys.all],
      [appointmentKeys.detail('appt-1'), appointmentKeys.all],
      [queueKeys.today(), queueKeys.all],
      [queueKeys.runningDelay(), queueKeys.all],
      [careThreadKeys.list('pp-1'), careThreadKeys.all],
      [careThreadKeys.detail('thread-1'), careThreadKeys.all],
      [healthKeys.section('pp-1', 'conditions'), healthKeys.all],
      [facilityKeys.members('fac-1'), facilityKeys.all],
      [facilityKeys.invites('fac-1'), facilityKeys.all],
      [facilityKeys.queue('fac-1'), facilityKeys.all],
      [facilitySearchKeys.list({ type: 'pharmacy' }), facilitySearchKeys.all],
      [auditKeys.page('events', { page: 1 }), auditKeys.all],
      [referralKeys.stuck('24h'), referralKeys.all],
      [referralKeys.candidates('cardio'), referralKeys.all],
      [systemKeys.readiness(), systemKeys.all],
      [systemKeys.jobs(), systemKeys.all],
      [systemKeys.outbox(), systemKeys.all],
      [flagKeys.list(), flagKeys.all],
      [flagKeys.history(), flagKeys.all],
      [accountKeys.dataExport(), accountKeys.all],
      [paymentKeys.intent('intent-1'), paymentKeys.all],
      [paymentKeys.walletLink(), paymentKeys.all],
      [paymentKeys.ledger('fac-1', { status: 'held' }), paymentKeys.ledgers()],
      [paymentKeys.ledgers(), paymentKeys.all],
      [consultationKeys.note('appt-1'), consultationKeys.all],
      [insightKeys.params({ preset: '7d' }), insightKeys.all],
      [messageKeys.threads('unread', null, 20), messageKeys.all],
      [appointmentKeys.mine(), appointmentKeys.all],
      [appointmentKeys.queue('appt-1'), appointmentKeys.all],
      [accountKeys.accessLog({ entityType: 'Appointment' }), accountKeys.all],
      [paymentKeys.history(), paymentKeys.all],
      [paymentKeys.historyEntry('ph-1'), paymentKeys.history()],
      [resultKeys.pendingAbnormal(), resultKeys.all],
      [calendarKeys.feed(), calendarKeys.all],
      [patientChartKeys.health('pp-1', 'allergies'), patientChartKeys.all('pp-1')],
      [patientChartKeys.careThread('pp-1'), patientChartKeys.all('pp-1')],
      [patientChartKeys.activeOrders('pp-1'), patientChartKeys.all('pp-1')],
      [patientChartKeys.recentResults('pp-1'), patientChartKeys.all('pp-1')],
    ];

    for (const [key, root] of roots) {
      expect(hasPrefix(key, root), `${JSON.stringify(key)} under ${JSON.stringify(root)}`).toBe(true);
    }
  });

  it('scopes profile-scoped lists by profile so a switch can never hit another profile’s cache', () => {
    expect(careThreadKeys.list('pp-1')).not.toEqual(careThreadKeys.list('pp-2'));
    expect(healthKeys.section('pp-1', 'conditions')).toEqual(['health', 'pp-1', 'conditions']);
    expect(healthKeys.section('pp-2', 'conditions')).not.toEqual(
      healthKeys.section('pp-1', 'conditions'),
    );
    expect(appointmentKeys.list('pp-1')).not.toEqual(appointmentKeys.list('pp-2'));
    // A chart never shows another patient's sub-resources.
    expect(patientChartKeys.activeOrders('pp-1')).not.toEqual(
      patientChartKeys.activeOrders('pp-2'),
    );
    expect(patientChartKeys.health('pp-1', 'allergies')).not.toEqual(
      patientChartKeys.health('pp-2', 'allergies'),
    );
    // Dependents come from /patients/me — deliberately NOT profile-scoped.
    expect(dependentKeys.all).toEqual(['dependents']);
  });

  it('keeps the flag list and history siblings, never children of one another', () => {
    expect(hasPrefix(flagKeys.list(), flagKeys.history())).toBe(false);
    expect(hasPrefix(flagKeys.history(), flagKeys.list())).toBe(false);
    expect(hasPrefix(flagKeys.list(), flagKeys.all)).toBe(true);
    expect(hasPrefix(flagKeys.history(), flagKeys.all)).toBe(true);
  });

  it('keeps invalidation roots narrow enough to mean something', () => {
    // An invite write's root must not also cover members or the queue.
    expect(hasPrefix(facilityKeys.members('fac-1'), facilityKeys.invites('fac-1'))).toBe(false);
    expect(hasPrefix(facilityKeys.queue('fac-1'), facilityKeys.invites('fac-1'))).toBe(false);
    // One section's key is not another section's prefix.
    expect(hasPrefix(healthKeys.section('pp-1', 'allergies'), healthKeys.section('pp-1', 'conditions'))).toBe(false);
    // A stuck-referral key never implies a candidates key.
    expect(hasPrefix(referralKeys.candidatesRoot(), referralKeys.stuckRoot())).toBe(false);
    expect(hasPrefix(referralKeys.stuckRoot(), referralKeys.candidatesRoot())).toBe(false);
  });
});
