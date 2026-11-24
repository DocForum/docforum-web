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
import { useFormatters } from '../../../i18n/formatters';
import { useT, type Translator } from '../../../i18n/useT';
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
function buildTimeline(intent: PaymentIntent, t: Translator): TimelineEntry[] {
  const initiated: TimelineEntry = {
    key: 'initiated',
    label: t('payments.timeline.initiated', 'Payment initiated'),
    at: intent.createdAt,
    state: 'done',
  };
  const heldUnresolved: TimelineEntry = {
    key: 'held',
    label: t('payments.timeline.held', 'Held in escrow'),
    at: null,
    state: 'done',
  };
  const settledUpcoming: TimelineEntry = {
    key: 'settled',
    label: t('payments.timeline.settled', 'Released or refunded once fulfilled'),
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
        { key: 'held', label: t('payments.timeline.held', 'Held in escrow'), at: null, state: 'upcoming' },
        settledUpcoming,
      ];
    case 'escrowed':
      return [
        initiated,
        { key: 'held', label: t('payments.timeline.held', 'Held in escrow'), at: intent.updatedAt, state: 'current' },
        settledUpcoming,
      ];
    case 'released':
      return [
        initiated,
        heldUnresolved,
        {
          key: 'released',
          label: t('payments.timeline.released', 'Released to the facility'),
          at: intent.updatedAt,
          state: 'done',
        },
      ];
    case 'refunded':
      return [
        initiated,
        heldUnresolved,
        { key: 'refunded', label: t('payments.timeline.refunded', 'Refunded to you'), at: intent.updatedAt, state: 'done' },
      ];
    case 'failed':
      return [
        initiated,
        { key: 'failed', label: t('payments.timeline.failed', 'Payment failed'), at: intent.updatedAt, state: 'current' },
      ];
  }
}

export function OrderPaymentPanel({ intent }: OrderPaymentPanelProps) {
  const t = useT();
  const { dateTime: formatDateTime } = useFormatters();
  const explorerUrl = transactionUrl(intent.stellarTxHash);
  const timeline = buildTimeline(intent, t);

  return (
    <section
      className={styles.panel}
      data-status={intent.status}
      aria-labelledby="order-payment-title"
    >
      <div className={styles.header}>
        <h2 id="order-payment-title">{t('payments.panel.title', 'Payment')}</h2>
        <span className={styles.statusPill} data-status={intent.status}>
          {statusLabel(intent.status, t)}
        </span>
      </div>

      <p className={styles.explanation}>{statusCopy(intent.status, t)}</p>
      {intent.status === 'failed' && (
        <p className={styles.supportNote} role="status">
          {t('payments.panel.failedSupport', 'Nothing was released to the facility. Please contact DocForum support and quote the order reference below.')}
        </p>
      )}

      <dl className={styles.facts}>
        <div className={styles.fact}>
          <dt>{t('payments.panel.amount', 'Amount')}</dt>
          <dd data-testid="payment-amount">{amountLabel(intent.amountStroops)}</dd>
        </div>
        <div className={styles.fact}>
          <dt>{t('payments.panel.started', 'Started')}</dt>
          <dd>{formatDateTime(intent.createdAt)}</dd>
        </div>
        <div className={styles.fact}>
          <dt>{t('payments.panel.orderReference', 'Order reference')}</dt>
          <dd>
            <code>{intent.orderId}</code>
          </dd>
        </div>
      </dl>

      <h3 className={styles.timelineTitle}>{t('payments.panel.timeline', 'Timeline')}</h3>
      <ol className={styles.timeline} aria-label={t('payments.panel.timeline', 'Payment timeline')}>
        {timeline.map((entry) => (
          <li key={entry.key} className={styles.timelineItem} data-state={entry.state}>
            <span className={styles.dot} aria-hidden="true" />
            <span className={styles.timelineLabel}>{entry.label}</span>
            <span className={styles.timelineDate}>{entry.at ? formatDateTime(entry.at) : '—'}</span>
            {entry.state === 'current' && (
              <span className={styles.currentTag}>{t('payments.panel.current', 'Current')}</span>
            )}
            {entry.state === 'upcoming' && (
              <span className={styles.upcomingTag}>{t('payments.panel.notYet', 'Not yet')}</span>
            )}
          </li>
        ))}
      </ol>

      {explorerUrl && (
        <p className={styles.explorer}>
          <a href={explorerUrl} target="_blank" rel="noopener noreferrer">
            {t('payments.panel.viewTransaction', 'View the latest transaction on the Stellar explorer ↗')}
          </a>
        </p>
      )}
    </section>
  );
}
