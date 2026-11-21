// --- Admin operations overview (Phase W6, issue #68) -------------------------
// ASSUMED contract against docforum-core#123 ("Admin operations overview API:
// queues, stuck items and failures in one place"), which has not landed. The
// backend aggregates every queue; this app only renders counts, ages and
// drill-down links, and never re-derives a queue client-side.
// See ARCHITECTURE_ESSENTIALS.md "Known assumptions — Phase W6".

/** The queues the overview board watches. */
export type OverviewQueueKey =
  | 'verifications'
  | 'stuck_referrals'
  | 'unrouted_orders'
  | 'stuck_payments'
  | 'failed_jobs'
  | 'disputes';

export interface OverviewQueue {
  key: OverviewQueueKey;
  label: string;
  /** Items needing attention. Zero when the section is unavailable. */
  count: number;
  /** ISO timestamp of the oldest waiting item, or null when the queue is empty. */
  oldestAt: string | null;
  /** In-app drill-down link (already a router path from the backend). */
  href: string;
  /**
   * False when the backend reports this section as unavailable (the source
   * service is down, or the queue is not implemented yet). The board renders
   * that muted, never as an error page.
   */
  available: boolean;
  /** Optional plain-language explanation for an unavailable section. */
  detail?: string | null;
}

export interface OperationsOverview {
  generatedAt: string;
  queues: OverviewQueue[];
}
