import { useMemo } from 'react';
import { Button } from '../../../components/Button';
import { EmptyState } from '../../../components/states/EmptyState';
import { InlineError } from '../../../components/states/InlineError';
import { Skeleton } from '../../../components/states/Skeleton';
import { useOpenDisputes } from '../hooks/useDisputes';
import { describeDisputeQueueError } from '../errors';
import { oldestAgeLabel, sortByAge } from '../queue';
import { DisputeCard } from './DisputeCard';
import { useT } from '../../../i18n/useT';
import styles from './Disputes.module.css';

export function DisputesQueue() {
  const t = useT();
  const query = useOpenDisputes();
  const now = Date.now();
  const loaded = useMemo(() => sortByAge(query.data?.pages.flatMap((page) => page.items) ?? []), [query.data]);
  const oldest = oldestAgeLabel(loaded, now, t);
  const count = query.hasNextPage
    ? t('adminDisputes.queue.countMore', '{count}+ open disputes', { count: loaded.length })
    : t('adminDisputes.queue.count', '{count, plural, one {# open dispute} other {# open disputes}}', { count: loaded.length });

  return (
    <section className={styles.console} aria-labelledby="disputes-heading">
      <div>
        <h1 className={styles.title} id="disputes-heading">
          {t('adminDisputes.queue.title', 'Fulfilment disputes')}
        </h1>
        <p className={styles.subtitle}>
          {t('adminDisputes.queue.subtitle', 'When a patient disputes a fulfilled order, the payment stays in escrow until an admin resolves it. Oldest first, because every open dispute is money that cannot move.')}
        </p>
      </div>

      {loaded.length > 0 && (
        <p className={styles.summary} role="status">
          {count}
          {oldest ? t('adminDisputes.queue.oldest', ' · oldest blocked {age}', { age: oldest }) : ''}
        </p>
      )}

      {query.isPending ? (
        <Skeleton lines={4} height="2.25rem" label={t('adminDisputes.queue.loading', 'Loading open disputes')} />
      ) : query.isError && loaded.length === 0 ? (
        <InlineError
          title={t('adminDisputes.queue.loadErrorTitle', 'The dispute queue could not be loaded')}
          message={describeDisputeQueueError(query.error, t)}
          onRetry={() => void query.refetch()}
          retryLabel={t('common.tryAgain', 'Try again')}
        />
      ) : loaded.length === 0 ? (
        <EmptyState
          title={t('adminDisputes.queue.emptyTitle', 'No open disputes. Nothing is stuck in escrow right now.')}
          description={t('adminDisputes.queue.emptyDescription', 'When a patient disputes a fulfilment, the escrow it blocks appears here for resolution.')}
          action={{ label: t('adminDisputes.queue.reload', 'Reload the queue'), onClick: () => void query.refetch() }}
        />
      ) : (
        <>
          {query.isError && (
            <InlineError
              title={t('adminDisputes.queue.staleTitle', 'Showing the disputes loaded before the error')}
              message={describeDisputeQueueError(query.error, t)}
              onRetry={() => void query.refetch()}
              retryLabel={t('common.tryAgain', 'Try again')}
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
                {t('adminDisputes.queue.loadOlder', 'Load older disputes')}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
