import { contractUrl, transactionUrl } from '../explorer';
import { amountLabel } from '../stroops';
import { formatDay, orderTypeLabel, refundDeadlineCopy, statusCopy, statusLabel } from '../status';
import type { PaymentHistoryEntry } from '../../../types/models';
import { useT } from '../../../i18n/useT';
import styles from './PaymentReceipt.module.css';

interface Props {
  entry: PaymentHistoryEntry;
  now: Date;
  formatDate?: (value: string) => string;
}

const defaultFormatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

/** Proof-of-payment view, deliberately printable: it carries the hashes and
 * the explorer addresses in plain text, so a printed copy is still verifiable
 * without a browser. `orderId` is not shown — it is an internal pointer, not
 * something a patient can act on. */
export function PaymentReceipt({ entry, now, formatDate = defaultFormatDate }: Props) {
  const t = useT();
  const txLink = transactionUrl(entry.stellarTxHash);
  const contractLink = contractUrl(entry.sorobanContractId);
  const refund = refundDeadlineCopy(entry.refundDeadlineAt, now, t, formatDate);

  return (
    <div className={styles.receipt} data-testid="payment-receipt">
      <p className={styles.brand}>DocForum</p>
      <h2 className={styles.heading}>{t('payments.receipt.title', 'Payment receipt')}</h2>

      <dl className={styles.fields}>
        <dt>{t('payments.receipt.paidOn', 'Paid on')}</dt>
        <dd>{formatDay(entry.createdAt, formatDate)}</dd>

        <dt>{t('payments.receipt.for', 'For')}</dt>
        <dd>{orderTypeLabel(entry.orderType, t)}</dd>

        {entry.facilityName ? (
          <>
            <dt>{t('payments.receipt.facility', 'Facility')}</dt>
            <dd>{entry.facilityName}</dd>
          </>
        ) : null}

        <dt>{t('payments.receipt.amount', 'Amount')}</dt>
        <dd className={styles.amount}>{amountLabel(entry.amountStroops)}</dd>

        <dt>{t('payments.receipt.status', 'Status')}</dt>
        <dd>{statusLabel(entry.status, t)}</dd>

        {refund ? (
          <>
            <dt>{t('payments.receipt.refundWindow', 'Refund window')}</dt>
            <dd>{refund}</dd>
          </>
        ) : null}

        {entry.stellarTxHash ? (
          <>
            <dt>{t('payments.receipt.transactionHash', 'Transaction hash')}</dt>
            <dd className={styles.mono}>{entry.stellarTxHash}</dd>
          </>
        ) : null}

        {entry.sorobanContractId ? (
          <>
            <dt>{t('payments.receipt.escrowContract', 'Escrow contract')}</dt>
            <dd className={styles.mono}>{entry.sorobanContractId}</dd>
          </>
        ) : null}
      </dl>

      {txLink || contractLink ? (
        <p className={styles.verify}>
          {t('payments.receipt.verify', 'Verify on the explorer:')}{' '}
          {txLink ? (
            <a href={txLink} target="_blank" rel="noopener noreferrer">
              {t('payments.receipt.transaction', 'transaction')}
            </a>
          ) : null}
          {txLink && contractLink ? ' · ' : null}
          {contractLink ? (
            <a href={contractLink} target="_blank" rel="noopener noreferrer">
              {t('payments.receipt.escrowContract', 'escrow contract')}
            </a>
          ) : null}
        </p>
      ) : (
        <p className={styles.verify}>
          {t('payments.receipt.noTransaction', 'No on-chain transaction yet — nothing to verify until this payment is funded.')}
        </p>
      )}

      <p className={styles.note}>{statusCopy(entry.status, t)}</p>
    </div>
  );
}
