import { useMemo } from 'react';
import { Button } from '../../../components/Button';
import { EmptyState } from '../../../components/states/EmptyState';
import { InlineError } from '../../../components/states/InlineError';
import { Skeleton } from '../../../components/states/Skeleton';
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
        <Skeleton lines={4} height="2.25rem" label="Loading open disputes" />
      ) : query.isError && loaded.length === 0 ? (
        <InlineError
          title="The dispute queue couldn't be loaded"
          message={describeDisputeQueueError(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : loaded.length === 0 ? (
        <EmptyState
          title="No open disputes. Nothing is stuck in escrow right now."
          description="When a patient disputes a fulfilment, the escrow it blocks appears here for resolution."
          action={{ label: 'Reload the queue', onClick: () => void query.refetch() }}
        />
      ) : (
        <>
          {query.isError && (
            <InlineError
              title="Showing the disputes loaded before the error"
              message={describeDisputeQueueError(query.error)}
              onRetry={() => void query.refetch()}
            />
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
