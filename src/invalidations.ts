// Invalidation map (issue #122): mutation → the query keys it must refresh.
//
// Every mutation that changes data a screen reads declares its blast radius
// here, once, as *typed* keys from `query-keys.ts` — hooks call
// `invalidateFor(queryClient, 'domain.action', …vars)` instead of writing
// raw string arrays. Two rules the map exists to enforce:
//
// 1. No over-invalidation: a write invalidates the narrowest key that
//    provably covers what changed (a health entry edit refreshes only that
//    profile's section, never every profile).
// 2. Nothing that changes a screen is silent: if a write moves data a
//    visible query shows, it has an entry — including the optimistic-only
//    paths (visit actions, intent actions) that previously left the list
//    stale until a poll.
//
// Mutations with no entry really do have no cached view (login, signup,
// order verification, account deletion — the last clears the whole cache).

import type { QueryClient, QueryKey } from '@tanstack/react-query';
import {
  accountKeys,
  adminUserKeys,
  catalogKeys,
  appointmentKeys,
  doctorKeys,
  auditKeys,
  dependentKeys,
  facilityKeys,
  flagKeys,
  healthKeys,
  overviewKeys,
  orderKeys,
  paymentKeys,
  queueKeys,
  referralKeys,
  systemKeys,
  verificationKeys,
} from './query-keys';
import type { HealthSectionKey } from './types/models';

export const invalidations = {
  /** Start/complete visit: the dashboard's appointment list and the queue panel both show the new status. */
  'queue.visit-action': () => [appointmentKeys.today(), queueKeys.today()],
  /** Manual override of the running delay. */
  'queue.running-delay': () => [queueKeys.runningDelay()],
  /** Add/edit/remove a health entry — one profile, one section. */
  'health-profile.write': (profileId: string, section: HealthSectionKey) => [
    healthKeys.section(profileId, section),
  ],
  /** Dependent add/edit/handover — session-scoped list. */
  'dependents.write': () => [dependentKeys.all],
  /** Invite, resend, revoke — the invites table only. */
  'facility.invite-write': (facilityId: string) => [facilityKeys.invites(facilityId)],
  'facility.member-removed': (facilityId: string) => [facilityKeys.members(facilityId)],
  /** A fulfillment record/item move changes the facility queue and the
   * patient-visible order status derived from it. */
  'facility.fulfillment-action': (facilityId: string) => [
    facilityKeys.queue(facilityId),
    orderKeys.all,
  ],
  /** A job run can move readiness, job rows, and outbox counts together. */
  'admin.run-job': () => [systemKeys.all],
  /** Flag writes update the list and its "last changed by…" audit lookup. */
  'admin.feature-flags.write': () => [flagKeys.all],
  'admin.catalog.write': () => [catalogKeys.all],
  /** Reassignment/cancellation moved the stuck queue we're showing. */
  'admin.referral.settled': () => [referralKeys.stuckRoot()],
  /** A 422 means the picker's candidate list is stale, not the queue. */
  'admin.referral.candidates': () => [referralKeys.candidatesRoot()],
  /** Fund/release/refund: the intent row plus held/released totals in ledgers. */
  'payments.intent-action': (intentId: string) => [
    paymentKeys.intent(intentId),
    paymentKeys.ledgers(),
  ],
  'payments.wallet-link': () => [paymentKeys.walletLink()],
  /** Prepare/submit during pay-with-wallet moves the intent's status and the
   * order panel's copy of it — both, never the ledgers (no money has moved
   * until the intent settles; when it does, `payments.intent-action` fires). */
  'payments.wallet-pay': (orderId: string, intentId: string) => [
    paymentKeys.orderIntent(orderId),
    paymentKeys.intent(intentId),
  ],
  /** A verification decision leaves the pending queue and writes an audit
   * event — the decision history is rendered from that trail. */
  'admin.verification.decision': (doctorProfileId: string) => [
    verificationKeys.detail(doctorProfileId),
    verificationKeys.list(),
    auditKeys.all,
  ],
  /** A requested export changes the status card (and its polling cadence). */
  'account.data-export': () => [accountKeys.dataExport()],
  /** Cancelling moves the appointment's status everywhere it is listed/detailed. */
  'appointment.cancel': (appointmentId: string) => [
    appointmentKeys.mine(),
    appointmentKeys.today(),
    appointmentKeys.detail(appointmentId),
    appointmentKeys.cancellationPolicy(appointmentId),
  ],
  /** Deactivate/reactivate changes the user row and the admin overview counts. */
  'admin.user.write': (userId: string) => [
    adminUserKeys.detail(userId),
    adminUserKeys.all,
    overviewKeys.all,
  ],
  /** Sending or revoking an admin invite changes only the pending list. */
  'admin.invites.write': () => [adminUserKeys.invites()],
  /** Confirm receipt or report problem: the order detail and the patient's order list. */
  'order.confirm-action': (orderId: string) => [orderKeys.detail(orderId), orderKeys.mine()],
  /** A confirmed booking changes the patient's list and makes the chosen
   * slot disappear from every availability view. */
  'appointments.book': () => [appointmentKeys.all, doctorKeys.slotsRoot],
};

export type InvalidationKey = keyof typeof invalidations;

/** Keys a given mutation must refresh — exposed for tests and doc tooling. */
export function invalidationScope<K extends InvalidationKey>(
  mutation: K,
  ...args: Parameters<(typeof invalidations)[K]>
): readonly QueryKey[] {
  return (invalidations[mutation] as (...values: unknown[]) => readonly QueryKey[])(...args);
}

/**
 * Refresh every key in a mutation's scope and settle only once they have all
 * been marked (and, for observed queries, refetched) — so an `onSuccess`
 * that returns this promise keeps React Query's lifecycle honest.
 */
export function invalidateFor<K extends InvalidationKey>(
  queryClient: QueryClient,
  mutation: K,
  ...args: Parameters<(typeof invalidations)[K]>
): Promise<void> {
  return Promise.all(
    invalidationScope(mutation, ...args).map((queryKey) =>
      queryClient.invalidateQueries({ queryKey }),
    ),
  ).then(() => undefined);
}
