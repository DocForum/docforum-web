import { Link, useParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { FormError } from '../components/FormError';
import { PaymentReceipt } from '../features/payments/components/PaymentReceipt';
import { contractUrl, transactionUrl } from '../features/payments/explorer';
import { usePaymentHistoryEntry } from '../features/payments/hooks/usePaymentHistory';
import { historyErrorCopy, statusLabel } from '../features/payments/status';
import styles from './PaymentDetailPage.module.css';

export function PaymentDetailPage() {
  const { intentId } = useParams();
  const entryQuery = usePaymentHistoryEntry(intentId);
  const now = new Date();

  if (entryQuery.isError) {
    return (
      <div className="container">
        <div className="card">
          <h1 className={styles.title}>Payment</h1>
          <FormError message={historyErrorCopy(entryQuery.error)} />
          <p className={styles.back}>
            <Link to="/payments">Back to your payments</Link>
          </p>
        </div>
      </div>
    );
  }

  const entry = entryQuery.data;
  if (!entry) {
    return (
      <div className="container">
        <div className="card">
          <h1 className={styles.title}>Payment</h1>
          <p className={styles.loading}>
            {entryQuery.isFetching ? 'Loading this payment…' : 'Sign in to see this payment.'}
          </p>
        </div>
      </div>
    );
  }

  const txLink = transactionUrl(entry.stellarTxHash);
  const contractLink = contractUrl(entry.sorobanContractId);

  return (
    <div className="container">
      <div className="card">
        <span className={`statusPill ${styles.noPrint}`}>{statusLabel(entry.status)}</span>
        <h1 className={styles.title}>Payment</h1>

        {/* The print button is the only action here: a receipt has to be
            produceable without a developer knowing which element to hide. */}
        <div className={styles.actions}>
          <Button variant="secondary" className={styles.noPrint} onClick={() => window.print()}>
            Print receipt
          </Button>
          {txLink ? (
            <a className={styles.noPrint} href={txLink} target="_blank" rel="noopener noreferrer">
              View transaction on the explorer
            </a>
          ) : null}
          {contractLink ? (
            <a className={styles.noPrint} href={contractLink} target="_blank" rel="noopener noreferrer">
              View escrow contract
            </a>
          ) : null}
        </div>

        <PaymentReceipt entry={entry} now={now} />

        <p className={`${styles.back} ${styles.noPrint}`}>
          <Link to="/payments">Back to your payments</Link>
        </p>
      </div>
    </div>
  );
}
