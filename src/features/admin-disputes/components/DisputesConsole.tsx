import { useId, useMemo } from 'react';
import { Button } from '../../../components/Button';
import { Spinner } from '../../../components/Spinner';
import { useOpenDisputes } from '../hooks/useDisputes';
import { describeQueueError } from '../errors';
import { formatAge, hoursSince, sortByAge } from '../queue';
import { DisputeCard } from './DisputeCard';
import styles from './Disputes.module.css';

/**
 * Admin queue of open fulfilment disputes, oldest first. Every open dispute
 * is blocking a payment release, so age is the priority signal: the longer
 * it sits, the longer the money stays in escrow.
 */
export function DisputesConsole() {
  const titleId = useId();
  const queue = useOpenDisputes();
  const disputes = useMemo(
    () => sortByAge(queue.data?.pages.flatMap((page) => page.items) ?? []),
    [queue.data],
  );
  // Ages are shown as of the last fetch, so they agree with what the server
  // called open.
  const now = queue.dataUpdatedAt || Date.now();
  const oldestHours = disputes[0] ? hoursSince(disputes[0].openedAt, now) : null;

  let body;
  if (queue.isLoading) {
    body = (
      <div className={styles.status} role="status">
        <Spinner size={20} />
        <span>Loading open disputes…</span>
      </div>
    );
  } else if (queue.error) {
    body = (
      <div className={styles.errorBox} role="alert">
        <p>{describeQueueError(queue.error)}</p>
        <Button variant="secondary" onClick={() => void queue.refetch()}>
          Try again
        </Button>
      </div>
    );
  } else if (disputes.length === 0) {
    body = (
      <p className={styles.empty}>
        No open disputes. Every reported order has been resolved, so nothing is holding escrow.
      </p>
    );
  } else {
    body = (
      <ul className={styles.list}>
        {disputes.map((dispute) => (
          <li key={dispute.id}>
            <DisputeCard dispute={dispute} now={now} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section className={styles.console} aria-labelledby={titleId}>
      <header>
        <h1 id={titleId} className={styles.title}>
          Fulfilment disputes
        </h1>
        <p className={styles.subtitle}>
          Open disputes block payment release. Work them oldest first, check the patient&apos;s report against the
          facility&apos;s proof, then resolve each one for the facility or the patient. Resolutions are final.
        </p>
      </header>

      {!queue.isLoading && !queue.error && disputes.length > 0 && (
        <p className={styles.summary} aria-live="polite">
          {disputes.length} open {disputes.length === 1 ? 'dispute' : 'disputes'} loaded
          {oldestHours !== null && ` · oldest open for ${formatAge(oldestHours)}`}
          {queue.isFetching && !queue.isFetchingNextPage && ' · updating…'}
        </p>
      )}

      {body}

      {queue.hasNextPage && (
        <div className={styles.loadMore}>
          <Button
            variant="secondary"
            onClick={() => void queue.fetchNextPage()}
            loading={queue.isFetchingNextPage}
            disabled={queue.isFetching}
          >
            {queue.isFetchingNextPage ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      )}
    </section>
  );
}
