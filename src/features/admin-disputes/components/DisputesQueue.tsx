import { useMemo } from 'react';
import { Button } from '../../../components/Button';
import { Spinner } from '../../../components/Spinner';
import { useOpenDisputes } from '../hooks/useDisputes';
import { describeDisputeQueueError } from '../errors';
import { oldestAgeLabel, sortByAge } from '../queue';
import { DisputeCard } from './DisputeCard';
import styles from './Disputes.module.css';

export function DisputesQueue() {
  const query = useOpenDisputes();
  const now = Date.now();
  const loaded = useMemo(() => sortByAge(query.data?.pages.flatMap((page) => page.items) ?? []), [query.data]);
  const oldest = oldestAgeLabel(loaded, now);
  const count = query.hasNextPage
    ? `${loaded.length}+ open disputes`
    : `${loaded.length} open ${loaded.length === 1 ? 'dispute' : 'disputes'}`;

  return (
    <section className={styles.console} aria-labelledby="disputes-heading">
      <div>
        <h1 className={styles.title} id="disputes-heading">
          Fulfilment disputes
        </h1>
        <p className={styles.subtitle}>
          When a patient disputes a fulfilled order, the payment stays in escrow until an admin resolves it. Oldest
          first, because every open dispute is money that can't move.
        </p>
      </div>

      {loaded.length > 0 && (
        <p className={styles.summary} role="status">
          {count}
          {oldest ? ` · oldest blocked ${oldest}` : ''}
        </p>
      )}

      {query.isPending ? (
        <p className={styles.status}>
          <Spinner />
          Loading open disputes…
        </p>
      ) : query.isError && loaded.length === 0 ? (
        <div className={styles.errorBox} role="alert">
          <p>{describeDisputeQueueError(query.error)}</p>
          <Button variant="secondary" onClick={() => void query.refetch()}>
            Try again
          </Button>
        </div>
      ) : loaded.length === 0 ? (
        <p className={styles.empty}>No open disputes. Nothing is stuck in escrow right now.</p>
      ) : (
        <>
          {query.isError && (
            <div className={styles.noticeWarning} role="alert">
              <p>{describeDisputeQueueError(query.error)} Showing the disputes loaded before the error.</p>
            </div>
          )}
          <ul className={styles.list}>
            {loaded.map((dispute) => (
              <li key={dispute.id}>
                <DisputeCard dispute={dispute} now={now} />
              </li>
            ))}
          </ul>
          {query.hasNextPage && (
            <div className={styles.loadMore}>
              <Button
                variant="secondary"
                loading={query.isFetchingNextPage}
                disabled={query.isFetchingNextPage}
                onClick={() => void query.fetchNextPage()}
              >
                Load older disputes
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
