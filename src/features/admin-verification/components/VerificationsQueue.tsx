import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/Button';
import { EmptyState } from '../../../components/states/EmptyState';
import { InlineError } from '../../../components/states/InlineError';
import { Skeleton } from '../../../components/states/Skeleton';
import { useVerificationQueue } from '../hooks/useVerifications';
import { ageTone, hoursSince, oldestAgeLabel, sortBySubmitted } from '../queue';
import { describeQueueError } from '../errors';
import type { VerificationQueueItem } from '../../../types/models';
import styles from './Verifications.module.css';

function submittedLabel(item: VerificationQueueItem, now: number): string {
  const date = new Date(item.submittedAt);
  const formatted = Number.isNaN(date.getTime())
    ? item.submittedAt
    : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  const hours = hoursSince(item.submittedAt, now);
  if (hours === null) return `Submitted ${formatted}`;
  if (hours >= 48) return `Submitted ${formatted} · ${Math.floor(hours / 24)} days ago`;
  if (hours >= 1) return `Submitted ${formatted} · ${hours}h ago`;
  return `Submitted ${formatted} · less than an hour ago`;
}

function QueueRow({ item, now }: { item: VerificationQueueItem; now: number }) {
  const hours = hoursSince(item.submittedAt, now);
  const tone = hours === null ? 'fresh' : ageTone(hours);

  return (
    <li className={styles.queueItem}>
      <div className={styles.queueItemMain}>
        <p className={styles.queueName}>{item.fullName}</p>
        <p className={styles.queueMeta}>
          {item.specialties.length > 0 ? item.specialties.join(', ') : 'No specialties listed'} ·{' '}
          {item.documentCount === 1 ? '1 document' : `${item.documentCount} documents`}
        </p>
        <p className={styles.queueMeta}>
          {submittedLabel(item, now)}{' '}
          <span className={styles.ageBadge} data-tone={tone}>
            {tone === 'critical' ? 'Overdue' : tone === 'elevated' ? 'Waiting' : 'In review'}
          </span>
        </p>
      </div>
      <Link className={styles.reviewLink} to={`/admin/verifications/${item.doctorProfileId}`}>
        Review
      </Link>
    </li>
  );
}

/**
 * The pending-verification queue: pending doctors, oldest first, with the
 * submitted date and document count the issue asks for. Sorting is re-applied
 * over every loaded page so "oldest first" holds across cursors.
 */
export function VerificationsQueue() {
  const queue = useVerificationQueue();
  const now = Date.now();

  const items = sortBySubmitted(queue.data?.pages.flatMap((page) => page.items) ?? []);

  let body: ReactNode;
  if (queue.isLoading) {
    body = <Skeleton lines={5} height="2.5rem" label="Loading applications" />;
  } else if (queue.isError) {
    body = (
      <InlineError
        title="Applications couldn't be loaded"
        message={describeQueueError(queue.error)}
        onRetry={() => void queue.refetch()}
      />
    );
  } else if (items.length === 0) {
    body = (
      <EmptyState
        title="No doctors are waiting for review."
        description="When doctors submit credentials for verification, they will appear in this queue."
        action={{ label: 'Refresh queue', onClick: () => void queue.refetch() }}
      />
    );
  } else {
    body = (
      <ul className={styles.queue}>
        {items.map((item) => (
          <QueueRow key={item.doctorProfileId} item={item} now={now} />
        ))}
      </ul>
    );
  }

  return (
    <section className={styles.console} aria-labelledby="verifications-heading">
      <header>
        <h1 className={styles.title} id="verifications-heading">
          Doctor verification
        </h1>
        <p className={styles.subtitle}>
          Doctors waiting for manual review (PRD FR-3). Unverified doctors never appear in patient search, so this
          queue controls who can be booked.
        </p>
      </header>

      {items.length > 0 ? <p className={styles.summary}>{oldestAgeLabel(items, now)}</p> : null}

      {body}

      {queue.hasNextPage ? (
        <div className={styles.loadMoreRow}>
          <Button variant="secondary" loading={queue.isFetchingNextPage} onClick={() => void queue.fetchNextPage()}>
            {queue.isFetchingNextPage ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
