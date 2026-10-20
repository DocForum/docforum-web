import { contractUrl, transactionUrl } from '../explorer';
import { amountLabel } from '../stroops';
import { formatDay, orderTypeLabel, refundDeadlineCopy, statusCopy, statusLabel } from '../status';
import type { PaymentHistoryEntry } from '../../../types/models';
import styles from './PaymentReceipt.module.css';

interface Props {
  entry: PaymentHistoryEntry;
  now: Date;
}

/** Proof-of-payment view, deliberately printable: it carries the hashes and
 * the explorer addresses in plain text, so a printed copy is still verifiable
 * without a browser. `orderId` is not shown — it is an internal pointer, not
 * something a patient can act on. */
export function PaymentReceipt({ entry, now }: Props) {
  const txLink = transactionUrl(entry.stellarTxHash);
  const contractLink = contractUrl(entry.sorobanContractId);
  const refund = refundDeadlineCopy(entry.refundDeadlineAt, now);

  return (
    <div className={styles.receipt} data-testid="payment-receipt">
      <p className={styles.brand}>DocForum</p>
      <h2 className={styles.heading}>Payment receipt</h2>

      <dl className={styles.fields}>
        <dt>Paid on</dt>
        <dd>{formatDay(entry.createdAt)}</dd>

        <dt>For</dt>
        <dd>{orderTypeLabel(entry.orderType)}</dd>

        {entry.facilityName ? (
          <>
            <dt>Facility</dt>
            <dd>{entry.facilityName}</dd>
          </>
        ) : null}

        <dt>Amount</dt>
        <dd className={styles.amount}>{amountLabel(entry.amountStroops)}</dd>

        <dt>Status</dt>
        <dd>{statusLabel(entry.status)}</dd>

        {refund ? (
          <>
            <dt>Refund window</dt>
            <dd>{refund}</dd>
          </>
        ) : null}

        {entry.stellarTxHash ? (
          <>
            <dt>Transaction hash</dt>
            <dd className={styles.mono}>{entry.stellarTxHash}</dd>
          </>
        ) : null}

        {entry.sorobanContractId ? (
          <>
            <dt>Escrow contract</dt>
            <dd className={styles.mono}>{entry.sorobanContractId}</dd>
          </>
        ) : null}
      </dl>

      {txLink || contractLink ? (
        <p className={styles.verify}>
          Verify on the explorer:{' '}
          {txLink ? (
            <a href={txLink} target="_blank" rel="noopener noreferrer">
              transaction
            </a>
          ) : null}
          {txLink && contractLink ? ' · ' : null}
          {contractLink ? (
            <a href={contractLink} target="_blank" rel="noopener noreferrer">
              escrow contract
            </a>
          ) : null}
        </p>
      ) : (
        <p className={styles.verify}>No on-chain transaction yet — nothing to verify until this payment is funded.</p>
      )}

      <p className={styles.note}>{statusCopy(entry.status)}</p>
    </div>
  );
}
