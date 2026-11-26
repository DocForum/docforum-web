import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/Button';
import { EmptyState } from '../../../components/states/EmptyState';
import { InlineError } from '../../../components/states/InlineError';
import { Skeleton } from '../../../components/states/Skeleton';
import { useOptionalT } from '../../../i18n/useOptionalT';
import type { Translator } from '../../../i18n/useT';
import { useVerificationQueue } from '../hooks/useVerifications';
import { ageTone, hoursSince, oldestAgeLabel, sortBySubmitted } from '../queue';
import { describeQueueError } from '../errors';
import type { VerificationQueueItem } from '../../../types/models';
import styles from './Verifications.module.css';

function submittedLabel(item: VerificationQueueItem, now: number, locale: string, t: Translator): string {
  const date = new Date(item.submittedAt);
  const formatted = Number.isNaN(date.getTime())
    ? item.submittedAt
    : date.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  const hours = hoursSince(item.submittedAt, now);
  if (hours === null) {
    return t('adminVerification.queue.submitted', 'Submitted {date}', { date: formatted });
  }
  if (hours >= 48) {
    return t(
      'adminVerification.queue.submittedDaysAgo',
      'Submitted {date} · {days, plural, one {# day} other {# days}} ago',
      { date: formatted, days: Math.floor(hours / 24) },
    );
  }
  if (hours >= 1) {
    return t('adminVerification.queue.submittedHoursAgo', 'Submitted {date} · {hours}h ago', {
      date: formatted,
      hours,
    });
  }
  return t('adminVerification.queue.submittedUnderHour', 'Submitted {date} · less than an hour ago', {
    date: formatted,
  });
}

function QueueRow({ item, now }: { item: VerificationQueueItem; now: number }) {
  const { locale, t } = useOptionalT();
  const hours = hoursSince(item.submittedAt, now);
  const tone = hours === null ? 'fresh' : ageTone(hours);

  return (
    <li className={styles.queueItem}>
      <div className={styles.queueItemMain}>
        <p className={styles.queueName}>{item.fullName}</p>
        <p className={styles.queueMeta}>
          {item.specialties.length > 0
            ? item.specialties.join(', ')
            : t('adminVerification.queue.noSpecialties', 'No specialties listed')}{' '}
          ·{' '}
          {t('adminVerification.queue.documents', '{count, plural, one {# document} other {# documents}}', {
            count: item.documentCount,
          })}
        </p>
        <p className={styles.queueMeta}>
          {submittedLabel(item, now, locale, t)}{' '}
          <span className={styles.ageBadge} data-tone={tone}>
            {tone === 'critical'
              ? t('adminVerification.queue.overdue', 'Overdue')
              : tone === 'elevated'
                ? t('adminVerification.queue.waiting', 'Waiting')
                : t('adminVerification.queue.inReview', 'In review')}
          </span>
        </p>
      </div>
      <Link className={styles.reviewLink} to={`/admin/verifications/${item.doctorProfileId}`}>
        {t('adminVerification.queue.review', 'Review')}
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
  const t = useOptionalT().t;
  const queue = useVerificationQueue();
  const now = Date.now();

  const items = sortBySubmitted(queue.data?.pages.flatMap((page) => page.items) ?? []);

  let body: ReactNode;
  if (queue.isLoading) {
    body = <Skeleton lines={5} height="2.5rem" label={t('adminVerification.queue.loading', 'Loading applications')} />;
  } else if (queue.isError) {
    body = (
      <InlineError
        title={t('adminVerification.queue.loadErrorTitle', "Applications couldn't be loaded")}
        message={describeQueueError(queue.error, t)}
        onRetry={() => void queue.refetch()}
      />
    );
  } else if (items.length === 0) {
    body = (
      <EmptyState
        title={t('adminVerification.queue.emptyTitle', 'No doctors are waiting for review.')}
        description={t(
          'adminVerification.queue.emptyDescription',
          'When doctors submit credentials for verification, they will appear in this queue.',
        )}
        action={{ label: t('adminVerification.queue.refresh', 'Refresh queue'), onClick: () => void queue.refetch() }}
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

  const oldest = oldestAgeLabel(items, now, t);

  return (
    <section className={styles.console} aria-labelledby="verifications-heading">
      <header>
        <h1 className={styles.title} id="verifications-heading">
          {t('adminVerification.queue.title', 'Doctor verification')}
        </h1>
        <p className={styles.subtitle}>
          {t(
            'adminVerification.queue.subtitle',
            'Doctors waiting for manual review (PRD FR-3). Unverified doctors never appear in patient search, so this queue controls who can be booked.',
          )}
        </p>
      </header>

      {items.length > 0 && oldest ? <p className={styles.summary}>{oldest}</p> : null}

      {body}

      {queue.hasNextPage ? (
        <div className={styles.loadMoreRow}>
          <Button variant="secondary" loading={queue.isFetchingNextPage} onClick={() => void queue.fetchNextPage()}>
            {queue.isFetchingNextPage
              ? t('adminVerification.queue.loadingMore', 'Loading…')
              : t('adminVerification.queue.loadMore', 'Load more')}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
