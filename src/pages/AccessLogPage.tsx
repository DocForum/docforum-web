import { useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from '../components/Button';
import { EmptyState } from '../components/states/EmptyState';
import { InlineError } from '../components/states/InlineError';
import { Skeleton } from '../components/states/Skeleton';
import { AccessLogFiltersForm } from '../features/account/components/AccessLogFilters';
import { AccessLogList } from '../features/account/components/AccessLogList';
import { reportConcernHref } from '../features/account/copy';
import { useAccessLog } from '../features/account/hooks/useAccessLog';
import { ApiError } from '../services/api-client';
import type { AccessLogFilters } from '../services/access-log-service';
import styles from './AccessLogPage.module.css';

export function AccessLogPage() {
  const [filters, setFilters] = useState<AccessLogFilters>({});
  const logQuery = useAccessLog(filters);

  const events = logQuery.data?.pages.flatMap((page) => page.events) ?? [];
  const concernHref = reportConcernHref();

  // An empty log is a claim about the patient's privacy, so it is only ever
  // rendered from a response that actually arrived. A failed request says so
  // instead — including when docforum-core#45 has not landed and the route
  // answers 404.
  let body: ReactNode;
  if (events.length > 0) {
    body = <AccessLogList events={events} />;
  } else if (logQuery.isError) {
    body = null;
  } else if (logQuery.isFetching) {
    body = <Skeleton lines={5} height="2rem" label="Loading your access log" />;
  } else {
    body = (
      <EmptyState
        title="No one has opened your record yet."
        description="When a clinician or facility does, it will appear here with the reason for the visit or order."
        action={{ label: 'Back to care summary', to: '/patient' }}
      />
    );
  }

  const errorMessage =
    logQuery.error instanceof ApiError && logQuery.error.status === 404
      ? 'Your access log is not available yet — DocForum has not started recording who opens records for this deployment.'
      : logQuery.error instanceof ApiError
        ? logQuery.error.message
        : 'Your access log could not be loaded.';

  return (
    <div className="container">
      <div className="card">
        <span className="statusPill">Privacy</span>
        <h1 className={styles.title}>Who viewed my records</h1>
        <p className={styles.intro}>
          DocForum writes down every time a clinician or facility opens your record. This page is that log — only
          what it actually contains, with the reason for each access.
        </p>

        <AccessLogFiltersForm onApply={setFilters} busy={logQuery.isFetching} />

        {logQuery.isError ? (
          <InlineError
            title={events.length > 0 ? "Older entries couldn't be loaded" : "Access log couldn't be loaded"}
            message={events.length > 0 ? 'Older access log entries could not be loaded.' : errorMessage}
            onRetry={() => void logQuery.refetch()}
          />
        ) : null}
        {body}

        {logQuery.hasNextPage ? (
          <Button
            variant="secondary"
            className={styles.older}
            onClick={() => logQuery.fetchNextPage()}
            loading={logQuery.isFetchingNextPage}
          >
            {logQuery.isFetchingNextPage ? 'Loading…' : 'Show older entries'}
          </Button>
        ) : null}

        <p className={styles.concern}>
          {concernHref ? (
            <>
              Seen something that does not look right?{' '}
              <a href={concernHref} rel="noopener noreferrer">
                Report a concern
              </a>{' '}
              and DocForum will investigate.
            </>
          ) : (
            <>
              Seen something that does not look right? Contact DocForum support to report a concern — no support
              channel is configured for this deployment yet, so this page will not invent a link.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
