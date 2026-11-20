import { beforeEach, describe, expect, it } from 'vitest';
import { QueryClient, type QueryKey } from '@tanstack/react-query';
import { invalidationScope, invalidateFor, invalidations } from './invalidations';
import {
  accountKeys,
  auditKeys,
  appointmentKeys,
  careThreadKeys,
  dependentKeys,
  facilityKeys,
  flagKeys,
  healthKeys,
  paymentKeys,
  queueKeys,
  referralKeys,
} from './query-keys';

let queryClient: QueryClient;

function seed(key: QueryKey, data: unknown = { ok: true }): QueryClient {
  queryClient.setQueryData(key, data);
  return queryClient;
}

function isInvalidated(key: QueryKey): boolean {
  return queryClient.getQueryState(key)?.isInvalidated === true;
}

describe('invalidation map', () => {
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  it('declares a scope for every mutation and no mutation name twice', () => {
    const names = Object.keys(invalidations);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) {
      const scope = invalidationScope(name as keyof typeof invalidations);
      expect(scope.length).toBeGreaterThan(0);
    }
  });

  it('refreshes the affected intent and the facility ledgers after a payment action — and nothing else', async () => {
    seed(paymentKeys.intent('intent-1'));
    seed(paymentKeys.intent('intent-2'));
    seed(paymentKeys.ledger('fac-1', { status: 'all' }));
    seed(paymentKeys.walletLink());
    seed(healthKeys.section('pp-1', 'conditions'));

    await invalidateFor(queryClient, 'payments.intent-action', 'intent-1');

    expect(isInvalidated(paymentKeys.intent('intent-1'))).toBe(true);
    expect(isInvalidated(paymentKeys.ledger('fac-1', { status: 'all' }))).toBe(true);
    expect(isInvalidated(paymentKeys.intent('intent-2'))).toBe(false);
    expect(isInvalidated(paymentKeys.walletLink())).toBe(false);
    expect(isInvalidated(healthKeys.section('pp-1', 'conditions'))).toBe(false);
  });

  it('refreshes the dashboard appointment list and the queue after a visit action', async () => {
    seed(appointmentKeys.today());
    seed(queueKeys.today());
    seed(appointmentKeys.list('pp-1'));
    seed(careThreadKeys.list('pp-1'));

    await invalidateFor(queryClient, 'queue.visit-action');

    expect(isInvalidated(appointmentKeys.today())).toBe(true);
    expect(isInvalidated(queueKeys.today())).toBe(true);
    // Narrow: the patient-facing appointment list is not the doctor's today list.
    expect(isInvalidated(appointmentKeys.list('pp-1'))).toBe(false);
    expect(isInvalidated(careThreadKeys.list('pp-1'))).toBe(false);
  });

  it('scopes a health write to the acting profile and the edited section', async () => {
    seed(healthKeys.section('pp-1', 'conditions'));
    seed(healthKeys.section('pp-1', 'medications'));
    seed(healthKeys.section('pp-2', 'conditions'));
    seed(dependentKeys.all);

    await invalidateFor(queryClient, 'health-profile.write', 'pp-1', 'conditions');

    expect(isInvalidated(healthKeys.section('pp-1', 'conditions'))).toBe(true);
    expect(isInvalidated(healthKeys.section('pp-1', 'medications'))).toBe(false);
    expect(isInvalidated(healthKeys.section('pp-2', 'conditions'))).toBe(false);
    expect(isInvalidated(dependentKeys.all)).toBe(false);
  });

  it('refreshes exactly one facility sub-list per facility mutation', async () => {
    seed(facilityKeys.invites('fac-1'));
    seed(facilityKeys.members('fac-1'));
    seed(facilityKeys.queue('fac-1'));
    seed(facilityKeys.invites('fac-2'));

    await invalidateFor(queryClient, 'facility.invite-write', 'fac-1');

    expect(isInvalidated(facilityKeys.invites('fac-1'))).toBe(true);
    expect(isInvalidated(facilityKeys.members('fac-1'))).toBe(false);
    expect(isInvalidated(facilityKeys.queue('fac-1'))).toBe(false);
    expect(isInvalidated(facilityKeys.invites('fac-2'))).toBe(false);

    await invalidateFor(queryClient, 'facility.fulfillment-action', 'fac-1');

    expect(isInvalidated(facilityKeys.queue('fac-1'))).toBe(true);
    expect(isInvalidated(facilityKeys.members('fac-1'))).toBe(false);
  });

  it('splits the referral paths: settled refreshes the queue, a 422 only the picker', async () => {
    seed(referralKeys.stuck('24h'));
    seed(referralKeys.candidatesRoot());

    await invalidateFor(queryClient, 'admin.referral.settled');

    expect(isInvalidated(referralKeys.stuck('24h'))).toBe(true);
    expect(isInvalidated(referralKeys.candidatesRoot())).toBe(false);

    queryClient.removeQueries({ queryKey: referralKeys.stuck('24h') });
    seed(referralKeys.stuck('24h'));

    await invalidateFor(queryClient, 'admin.referral.candidates');

    expect(isInvalidated(referralKeys.candidatesRoot())).toBe(true);
    expect(isInvalidated(referralKeys.stuck('24h'))).toBe(false);
  });

  it('refreshes both flag siblings on a write, but nothing outside the flag root', async () => {
    seed(flagKeys.list());
    seed(flagKeys.history());
    seed(auditKeys.page('events', { page: 1 }));

    await invalidateFor(queryClient, 'admin.feature-flags.write');

    expect(isInvalidated(flagKeys.list())).toBe(true);
    expect(isInvalidated(flagKeys.history())).toBe(true);
    expect(isInvalidated(auditKeys.page('events', { page: 1 }))).toBe(false);
  });

  it('leaves unrelated roots untouched for session-scoped writes', async () => {
    seed(dependentKeys.all);
    seed(appointmentKeys.today());
    seed(careThreadKeys.list('pp-1'));
    seed(accountKeys.dataExport());

    await invalidateFor(queryClient, 'dependents.write');

    expect(isInvalidated(dependentKeys.all)).toBe(true);
    expect(isInvalidated(appointmentKeys.today())).toBe(false);
    expect(isInvalidated(careThreadKeys.list('pp-1'))).toBe(false);
    expect(isInvalidated(accountKeys.dataExport())).toBe(false);
  });
});
