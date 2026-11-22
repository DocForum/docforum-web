import { Link, useParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { EmptyState } from '../components/states/EmptyState';
import { InlineError } from '../components/states/InlineError';
import { Skeleton } from '../components/states/Skeleton';
import { PaymentReceipt } from '../features/payments/components/PaymentReceipt';
import { contractUrl, transactionUrl } from '../features/payments/explorer';
import { usePaymentHistoryEntry } from '../features/payments/hooks/usePaymentHistory';
import { historyErrorCopy, statusLabel } from '../features/payments/status';
import { useFormatters } from '../i18n/formatters';
import { useT } from '../i18n/useT';
import styles from './PaymentDetailPage.module.css';

export function PaymentDetailPage() {
  const t = useT();
  const { date: formatDate } = useFormatters();
  const { intentId } = useParams();
  const entryQuery = usePaymentHistoryEntry(intentId);
  const now = new Date();

  if (entryQuery.isError) {
    return (
      <div className="container">
        <div className="card">
          <h1 className={styles.title}>Payment</h1>
          <InlineError
            title="Payment couldn't be loaded"
            message={historyErrorCopy(entryQuery.error)}
            onRetry={() => void entryQuery.refetch()}
          />
          <p className={styles.back}>
            <Link to="/payments">{t('payments.detail.back', 'Back to your payments')}</Link>
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
          {entryQuery.isFetching ? (
            <Skeleton
              lines={6}
              height="1.75rem"
              label={t('payments.detail.loading', 'Loading this payment…')}
            />
          ) : (
            <EmptyState
              title={t('payments.detail.signIn', 'Sign in to see this payment.')}
              description="This payment receipt is tied to a DocForum account."
              action={{ label: 'Sign in', to: '/login' }}
            />
          )}
        </div>
      </div>
    );
  }

  const txLink = transactionUrl(entry.stellarTxHash);
  const contractLink = contractUrl(entry.sorobanContractId);

  return (
    <div className="container">
      <div className="card">
        <span className={`statusPill ${styles.noPrint}`}>{statusLabel(entry.status, t)}</span>
        <h1 className={styles.title}>{t('payments.detail.title', 'Payment')}</h1>

        {/* The print button is the only action here: a receipt has to be
            produceable without a developer knowing which element to hide. */}
        <div className={styles.actions}>
          <Button variant="secondary" className={styles.noPrint} onClick={() => window.print()}>
            {t('payments.detail.print', 'Print receipt')}
          </Button>
          {txLink ? (
            <a className={styles.noPrint} href={txLink} target="_blank" rel="noopener noreferrer">
              {t('payments.detail.viewTransaction', 'View transaction on the explorer')}
            </a>
          ) : null}
          {contractLink ? (
            <a className={styles.noPrint} href={contractLink} target="_blank" rel="noopener noreferrer">
              {t('payments.detail.viewContract', 'View escrow contract')}
            </a>
          ) : null}
        </div>

        <PaymentReceipt entry={entry} now={now} formatDate={formatDate} />

        <p className={`${styles.back} ${styles.noPrint}`}>
          <Link to="/payments">{t('payments.detail.back', 'Back to your payments')}</Link>
        </p>
      </div>
    </div>
  );
}
