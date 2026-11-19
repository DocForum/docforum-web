import { useMemo } from 'react';
import { Button } from '../../../components/Button';
import { EmptyState } from '../../../components/states/EmptyState';
import { InlineError } from '../../../components/states/InlineError';
import { Skeleton } from '../../../components/states/Skeleton';
import { useT } from '../../../i18n/useT';
import { useOpenDisputes } from '../hooks/useDisputes';
import { describeDisputeQueueError } from '../errors';
import { oldestAgeLabel, sortByAge } from '../queue';
import { DisputeCard } from './DisputeCard';
import styles from './Disputes.module.css';

export function DisputesQueue() {
  const t = useT();
  const query = useOpenDisputes();
  const now = Date.now();
  const loaded = useMemo(() => sortByAge(query.data?.pages.flatMap((page) => page.items) ?? []), [query.data]);
  const oldest = oldestAgeLabel(loaded, now);
  const count = query.hasNextPage
    ? t('admin.disputes.countMore', '{count}+ open disputes', { count: loaded.length })
    : t('admin.disputes.count', '{count, plural, one {1 open dispute} other {# open disputes}}', {
        count: loaded.length,
      });

  return (
    <section className={styles.console} aria-labelledby="disputes-heading">
      <div>
        <h1 className={styles.title} id="disputes-heading">
          {t('admin.disputes.title', 'Fulfilment disputes')}
        </h1>
        <p className={styles.subtitle}>
          {t(
            'admin.disputes.subtitle',
            "When a patient disputes a fulfilled order, the payment stays in escrow until an admin resolves it. Oldest first, because every open dispute is money that can't move.",
          )}
        </p>
      </div>

      {loaded.length > 0 && (
        <p className={styles.summary} role="status">
          {count}
          {oldest
            ? t('admin.disputes.oldest', ' · oldest blocked {age}', { age: oldest })
            : ''}
        </p>
      )}

      {query.isPending ? (
        <Skeleton
          lines={4}
          height="2.25rem"
          label={t('admin.disputes.loading', 'Loading open disputes')}
        />
      ) : query.isError && loaded.length === 0 ? (
        <InlineError
          title={t('admin.disputes.queueErrorTitle', "The dispute queue couldn't be loaded")}
          message={describeDisputeQueueError(query.error, t)}
          onRetry={() => void query.refetch()}
        />
      ) : loaded.length === 0 ? (
        <EmptyState
          title={t(
            'admin.disputes.emptyTitle',
            'No open disputes. Nothing is stuck in escrow right now.',
          )}
          description={t(
            'admin.disputes.emptyDescription',
            'When a patient disputes a fulfilment, the escrow it blocks appears here for resolution.',
          )}
          action={{
            label: t('admin.disputes.reload', 'Reload the queue'),
            onClick: () => void query.refetch(),
          }}
        />
      ) : (
        <>
          {query.isError && (
            <InlineError
              title={t(
                'admin.disputes.partialErrorTitle',
                'Showing the disputes loaded before the error',
              )}
              message={describeDisputeQueueError(query.error, t)}
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
                {t('admin.disputes.loadMore', 'Load older disputes')}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
