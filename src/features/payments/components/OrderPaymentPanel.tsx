// Payment status panel on a patient's order (issue #61, custodial v1).
//
// Patient-facing by design: plain-language explanation + timeline for
// every status, bigint-safe amount (formatStroops), and an explorer link
// built by #10's helper (features/payments/explorer.ts). Internal /
// console-only fields — facilityId, patientProfileId, escrowId,
// sorobanContractId — are deliberately never rendered here.
import { formatStroops } from '../../../services/payments-service';
import { txExplorerUrl } from '../explorer';
import type { PaymentIntent, PaymentIntentStatus } from '../../../types/models';
import styles from './OrderPaymentPanel.module.css';

export interface OrderPaymentPanelProps {
  intent: PaymentIntent;
}

const STATUS_LABELS: Record<PaymentIntentStatus, string> = {
  created: 'Pending',
  escrowed: 'Held in escrow',
  released: 'Released to the facility',
  refunded: 'Refunded',
  failed: 'Failed',
};

const STATUS_COPY: Record<PaymentIntentStatus, string> = {
  created:
    'Your payment has not been funded into escrow yet — nothing has been charged. It moves to “Held in escrow” once funding confirms.',
  escrowed:
    'Your payment is held in escrow, a protected holding state, while the facility fulfils your order. The facility is only paid when the order completes; if it falls through, the money is refunded instead.',
  released:
    'Your order was fulfilled, so the escrowed payment has been released to the facility. This payment is complete.',
  refunded:
    'This payment was refunded — the escrowed amount went back to you instead of to the facility, because the order did not go through.',
  failed:
    'Something went wrong and this payment could not be completed. Nothing was released to the facility. Please contact DocForum support and quote the order reference below.',
};

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

export function OrderPaymentPanel({ intent }: OrderPaymentPanelProps) {
  const explorerUrl = txExplorerUrl(intent.stellarTxHash);
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
          {STATUS_LABELS[intent.status]}
        </span>
      </div>

      <p className={styles.explanation}>{STATUS_COPY[intent.status]}</p>

      <dl className={styles.facts}>
        <div className={styles.fact}>
          <dt>Amount</dt>
          <dd data-testid="payment-amount">{formatStroops(intent.amountStroops)}</dd>
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
            View the latest transaction on the Stellar testnet explorer ↗
          </a>
        </p>
      )}
    </section>
  );
}
