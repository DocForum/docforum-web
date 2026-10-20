import type { ReactNode } from 'react';
import { Button } from '../components/Button';
import { FormError } from '../components/FormError';
import { PaymentHistoryList } from '../features/payments/components/PaymentHistoryList';
import { usePaymentHistory } from '../features/payments/hooks/usePaymentHistory';
import { historyErrorCopy } from '../features/payments/status';
import styles from './PaymentHistoryPage.module.css';

export function PaymentHistoryPage() {
  const historyQuery = usePaymentHistory();
  const entries = historyQuery.data?.pages.flatMap((page) => page.intents) ?? [];

  // "You have paid for nothing" is a statement about the patient's money, so
  // it is only rendered from a response that arrived. A failed request says
  // what failed instead — and a later page failing still shows what loaded.
  let body: ReactNode;
  if (entries.length > 0) body = <PaymentHistoryList entries={entries} />;
  else if (historyQuery.isError) body = null;
  else if (historyQuery.isFetching) body = <p className={styles.loading}>Loading your payments…</p>;
  else body = <PaymentHistoryList entries={[]} />;

  return (
    <div className="container">
      <div className="card">
        <span className="statusPill">Payments</span>
        <h1 className={styles.title}>Your payments</h1>
        <p className={styles.intro}>
          Every payment you have made through DocForum, with where the money is now: still yours, held in escrow,
          released to the facility, or returned to you.
        </p>

        {historyQuery.isError ? (
          <FormError message={entries.length > 0 ? 'Older payments could not be loaded.' : historyErrorCopy(historyQuery.error)} />
        ) : null}

        {body}

        {historyQuery.hasNextPage ? (
          <Button
            variant="secondary"
            className={styles.older}
            onClick={() => historyQuery.fetchNextPage()}
            loading={historyQuery.isFetchingNextPage}
          >
            {historyQuery.isFetchingNextPage ? 'Loading…' : 'Show older payments'}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
