import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMessageThreads } from '../hooks/useMessageThreads';
import { Button } from '../../../components/Button';
import { EmptyState } from '../../../components/states/EmptyState';
import { InlineError } from '../../../components/states/InlineError';
import { queryErrorMessage } from '../../../components/states/QueryState';
import { Skeleton } from '../../../components/states/Skeleton';
import styles from './DoctorInbox.module.css';

function truncate(text: string | undefined | null, max = 60) {
  if (!text) return '—';
  return text.length > max ? text.slice(0, max) + '…' : text;
}

function filterLabel(filter: string) {
  return {
    all: 'All threads',
    unread: 'Unread only',
    closing_soon: 'Closing soon',
  }[filter] ?? filter;
}

type ThreadFilter = 'all' | 'unread' | 'closing_soon';

const FILTERS: ThreadFilter[] = ['all', 'unread', 'closing_soon'];

export function DoctorInbox() {
  const [filter, setFilter] = useState<ThreadFilter>('all');
  const [cursor, setCursor] = useState<string | null>(null);

  const {
    threads,
    totalUnread,
    hasMore,
    nextCursor,
    isLoading,
    isFetching,
    error,
    refetch,
    markRead,
  } = useMessageThreads({ filter, cursor, limit: 10 });

  const handleLoadMore = () => {
    setCursor(nextCursor);
  };

  const handleMarkRead = (threadId: string) => {
    markRead.mutate(threadId);
  };

  return (
    <section className={styles.inbox}>
      <header className={styles.inboxHeader}>
        <h2>Message inbox</h2>
        <span className={styles.badge} aria-label={String(totalUnread) + ' unread messages'}>
          {totalUnread}
        </span>
      </header>

      <div className={styles.filters}>
        {FILTERS.map((f) => (
          <Button
            key={f}
            variant="secondary"
            onClick={() => {
              setFilter(f);
              setCursor(null);
            }}
            className={filter === f ? styles.activeFilter : undefined}
          >
            {filterLabel(f)}
          </Button>
        ))}
      </div>

      {isLoading && threads.length === 0 ? (
        <Skeleton lines={5} height="1.25rem" label="Loading threads" />
      ) : error ? (
        <InlineError
          title="Your inbox couldn't be loaded"
          message={queryErrorMessage(error)}
          onRetry={() => void refetch()}
        />
      ) : threads.length === 0 ? (
        <EmptyState
          title="No threads match the current filter"
          description={
            filter === 'all'
              ? 'When a patient messages you, the thread appears here with its unread count.'
              : 'Nothing in this view right now — the other filters may have threads waiting.'
          }
          action={
            filter === 'all'
              ? { label: 'Refresh inbox', onClick: () => void refetch() }
              : {
                  label: 'Show all threads',
                  onClick: () => {
                    setFilter('all');
                    setCursor(null);
                  },
                }
          }
        />
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Patient</th>
              <th>Last message</th>
              <th className={styles.waitingCol}>Waiting</th>
              <th className={styles.unreadCol}>Unread</th>
              <th className={styles.actionCol}>Action</th>
            </tr>
          </thead>
          <tbody>
            {threads.map((thread) => (
              <tr key={thread.id} className={styles.row}>
                <td className={styles.name}>
                  <Link to={'/care/threads/' + thread.id}>{thread.patientName}</Link>
                </td>
                <td className={styles.preview}>{truncate(thread.lastPreview)}</td>
                <td className={styles.waitingCol}>
                  {thread.waitingMinutes == null ? '—' : thread.waitingMinutes + ' min'}
                </td>
                <td className={styles.unreadCol}>
                  {thread.unreadCount > 0 ? (
                    <span className={styles.unreadBadge}>{thread.unreadCount}</span>
                  ) : (
                    <span className={styles.unreadZero}>—</span>
                  )}
                </td>
                <td className={styles.actionCol}>
                  {thread.unreadCount > 0 && (
                    <Button
                      variant="secondary"
                      onClick={() => handleMarkRead(thread.id)}
                      disabled={markRead.isPending}
                      loading={markRead.isPending}
                    >
                      Mark read
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {hasMore && !isFetching && (
        <Button onClick={handleLoadMore} variant="secondary">
          Load more
        </Button>
      )}
      {isFetching && hasMore && <span className={styles.loadingMore}>Loading more…</span>}
    </section>
  );
}
