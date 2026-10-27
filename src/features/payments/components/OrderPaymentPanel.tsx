// Payment status panel on a patient's order (issue #61, custodial v1).
//
// Patient-facing by design: plain-language explanation + timeline for
// every status, BigInt-safe amount (shared stroops helper), and explorer
// links through #10's shared helper (features/payments/explorer.ts — the
// same one PaymentDetailPage and the payout ledger use). Status copy and
// labels come from features/payments/status.ts, so the wording matches
// the payment history screens — one source of truth for what patients
// read. Internal/console-only fields — facilityId, patientProfileId,
// escrowId, sorobanContractId — are deliberately never rendered here.
import { amountLabel } from '../stroops';
import { transactionUrl } from '../explorer';
import { statusCopy, statusLabel } from '../status';
import type { PaymentIntent } from '../../../types/models';
import styles from './OrderPaymentPanel.module.css';

export interface OrderPaymentPanelProps {
  intent: PaymentIntent;
}

interface TimelineEntry {
  key: string;
  label: string;
  /** null when docforum-core doesn't expose a time for this step. */
  at: string | null;
  state: 'done' | 'current' | 'upcoming';
}

/**
 * Status timeline. Assumptions (ARCHITECTURE_ESSENTIALS.md): `updatedAt`
 * is the most recent status change, and there is no per-event history —
 * so earlier steps of a finished payment are shown without a time, and
 * a still-pending payment shows its future steps as upcoming. For
 * `created` the outcome isn't known yet, so the last step stays neutral
 * ("released or refunded").
 */
function buildTimeline(intent: PaymentIntent): TimelineEntry[] {
  const initiated: TimelineEntry = {
    key: 'initiated',
    label: 'Payment initiated',
    at: intent.createdAt,
    state: 'done',
  };
  const heldUnresolved: TimelineEntry = {
    key: 'held',
    label: 'Held in escrow',
    at: null,
    state: 'done',
  };
  const settledUpcoming: TimelineEntry = {
    key: 'settled',
    label: 'Released or refunded once fulfilled',
    at: null,
    state: 'upcoming',
  };

  switch (intent.status) {
    case 'created':
      // Prepared and waiting for the patient's wallet to sign (issue #59's
      // assumed status, core#80) — still unfunded, so the same timeline.
      // falls through
    case 'awaiting_signature':
      return [
        initiated,
        { key: 'held', label: 'Held in escrow', at: null, state: 'upcoming' },
        settledUpcoming,
      ];
    case 'escrowed':
      return [
        initiated,
        { key: 'held', label: 'Held in escrow', at: intent.updatedAt, state: 'current' },
        settledUpcoming,
      ];
    case 'released':
      return [
        initiated,
        heldUnresolved,
        {
          key: 'released',
          label: 'Released to the facility',
          at: intent.updatedAt,
          state: 'done',
        },
      ];
    case 'refunded':
      return [
        initiated,
        heldUnresolved,
        { key: 'refunded', label: 'Refunded to you', at: intent.updatedAt, state: 'done' },
      ];
    case 'failed':
      return [
        initiated,
        { key: 'failed', label: 'Payment failed', at: intent.updatedAt, state: 'current' },
      ];
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}

/** A failed payment needs a human to intervene, so the panel says so
 * explicitly instead of leaving the patient with a bare status word. */
const FAILED_SUPPORT_NOTE =
  'Nothing was released to the facility. Please contact DocForum support and quote the order reference below.';

export function OrderPaymentPanel({ intent }: OrderPaymentPanelProps) {
  const explorerUrl = transactionUrl(intent.stellarTxHash);
  const timeline = buildTimeline(intent);

  return (
    <section
      className={styles.panel}
      data-status={intent.status}
      aria-labelledby="order-payment-title"
    >
      <div className={styles.header}>
        <h2 id="order-payment-title">Payment</h2>
        <span className={styles.statusPill} data-status={intent.status}>
          {statusLabel(intent.status)}
        </span>
      </div>

      <p className={styles.explanation}>{statusCopy(intent.status)}</p>
      {intent.status === 'failed' && (
        <p className={styles.supportNote} role="status">
          {FAILED_SUPPORT_NOTE}
        </p>
      )}

      <dl className={styles.facts}>
        <div className={styles.fact}>
          <dt>Amount</dt>
          <dd data-testid="payment-amount">{amountLabel(intent.amountStroops)}</dd>
        </div>
        <div className={styles.fact}>
          <dt>Started</dt>
          <dd>{formatDate(intent.createdAt)}</dd>
        </div>
        <div className={styles.fact}>
          <dt>Order reference</dt>
          <dd>
            <code>{intent.orderId}</code>
          </dd>
        </div>
      </dl>

      <h3 className={styles.timelineTitle}>Timeline</h3>
      <ol className={styles.timeline} aria-label="Payment timeline">
        {timeline.map((entry) => (
          <li key={entry.key} className={styles.timelineItem} data-state={entry.state}>
            <span className={styles.dot} aria-hidden="true" />
            <span className={styles.timelineLabel}>{entry.label}</span>
            <span className={styles.timelineDate}>{formatDate(entry.at)}</span>
            {entry.state === 'current' && (
              <span className={styles.currentTag}>Current</span>
            )}
            {entry.state === 'upcoming' && (
              <span className={styles.upcomingTag}>Not yet</span>
            )}
          </li>
        ))}
      </ol>

      {explorerUrl && (
        <p className={styles.explorer}>
          <a href={explorerUrl} target="_blank" rel="noopener noreferrer">
            View the latest transaction on the Stellar explorer ↗
          </a>
        </p>
      )}
    </section>
  );
}
