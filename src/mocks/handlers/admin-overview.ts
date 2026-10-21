// Admin operations overview (issue #68). Dev-mock only: the contract itself
// is assumed until docforum-core#123 lands (see ARCHITECTURE_ESSENTIALS.md).
// Sections are derived from the mock db where it models the queue; queues it
// doesn't model (verifications, stuck referrals, failed jobs) come back
// `available: false`, so the board's muted card state is exercisable in
// `npm run dev:mock` alongside the populated one.
import { http } from 'msw';
import { db } from '../db';
import { respond } from '../helpers';
import { useMockStore } from '../mock-store';
import type { AdminOverview, AdminOverviewSection } from '../../types/models';

/** Oldest timestamp among the rows, or null when there are none. */
function oldestOf(timestamps: Array<string | null | undefined>): string | null {
  let oldest: string | null = null;
  for (const timestamp of timestamps) {
    if (!timestamp) continue;
    const parsed = Date.parse(timestamp);
    if (Number.isNaN(parsed)) continue;
    if (oldest === null || parsed < Date.parse(oldest)) oldest = timestamp;
  }
  return oldest;
}

function unavailable(key: string, label: string): AdminOverviewSection {
  return { key, label, available: false, count: null, oldestItemCreatedAt: null };
}

function buildOverview(): AdminOverview {
  // The dev panel's "empty" scenario means every queue is clear — same
  // contract as the `list` handlers, applied to this object body.
  if (useMockStore.getState().scenario === 'empty') {
    return {
      generatedAt: new Date().toISOString(),
      sections: [
        { key: 'verifications', label: 'Doctor verifications', available: true, count: 0, oldestItemCreatedAt: null },
        { key: 'stuck_referrals', label: 'Stuck referrals', available: true, count: 0, oldestItemCreatedAt: null },
        { key: 'unrouted_orders', label: 'Unrouted orders', available: true, count: 0, oldestItemCreatedAt: null },
        { key: 'stuck_payments', label: 'Stuck payments', available: true, count: 0, oldestItemCreatedAt: null },
        { key: 'failed_jobs', label: 'Failed jobs', available: true, count: 0, oldestItemCreatedAt: null },
        { key: 'open_disputes', label: 'Open disputes', available: true, count: 0, oldestItemCreatedAt: null },
      ],
    };
  }

  const unrouted = db.patientOrders.filter(
    (order) =>
      order.status === 'active' &&
      order.requiresFacilitySelection &&
      order.selectedFacility === null,
  );
  const stuckPayments = db.paymentIntents.filter(
    (intent) => intent.status === 'created' || intent.status === 'escrowed',
  );
  const openDisputes = db.disputes.filter((dispute) => dispute.status === 'open');

  const sections: AdminOverviewSection[] = [
    // The mock db has no verification queue or stuck-referral queue, and no
    // background-job table — reported unavailable, exactly the state the
    // board must render as a muted card.
    unavailable('verifications', 'Doctor verifications'),
    unavailable('stuck_referrals', 'Stuck referrals'),
    {
      key: 'unrouted_orders',
      label: 'Unrouted orders',
      available: true,
      count: unrouted.length,
      oldestItemCreatedAt: oldestOf(unrouted.map((order) => order.issuedAt)),
    },
    {
      key: 'stuck_payments',
      label: 'Stuck payments',
      available: true,
      count: stuckPayments.length,
      oldestItemCreatedAt: oldestOf(stuckPayments.map((intent) => intent.createdAt)),
    },
    unavailable('failed_jobs', 'Failed jobs'),
    {
      key: 'open_disputes',
      label: 'Open disputes',
      available: true,
      count: openDisputes.length,
      oldestItemCreatedAt: oldestOf(openDisputes.map((dispute) => dispute.openedAt)),
    },
  ];

  return { generatedAt: new Date().toISOString(), sections };
}

export const adminOverviewHandlers = [
  http.get(
    '*/admin/overview',
    respond('json', () => buildOverview()),
  ),
];
