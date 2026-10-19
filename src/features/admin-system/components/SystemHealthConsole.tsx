import { useId, useState } from 'react';
import { Button } from '../../../components/Button';
import { useJobs, useOutboxSummary, useReadiness } from '../hooks/useSystemHealth';
import { REFRESH_INTERVAL_MS } from '../status';
import { JobsPanel } from './JobsPanel';
import { ReadinessPanel } from './ReadinessPanel';
import { RecentFailures } from './RecentFailures';
import { RunJobDialog } from './RunJobDialog';
import { SystemOverview } from './SystemOverview';
import type { BackgroundJob } from '../../../types/models';
import styles from './SystemHealth.module.css';

/**
 * Admin view of docforum-core's own health: readiness checks, background
 * jobs (last success, last failure, next run, run now) and the outbox's
 * dead letters. Everything polls while the tab is visible, and each source
 * fails on its own — a missing outbox endpoint doesn't hide the jobs.
 */
export function SystemHealthConsole() {
  const titleId = useId();
  const readiness = useReadiness();
  const jobs = useJobs();
  const outbox = useOutboxSummary();
  const [runTarget, setRunTarget] = useState<BackgroundJob | null>(null);

  // Re-rendered on every poll, so relative times stay current with the data.
  const now = Date.now();
  const lastUpdated = Math.max(readiness.dataUpdatedAt, jobs.dataUpdatedAt, outbox.dataUpdatedAt);
  const fetching = readiness.isFetching || jobs.isFetching || outbox.isFetching;

  const refreshAll = () => {
    void readiness.refetch();
    void jobs.refetch();
    void outbox.refetch();
  };

  return (
    <section className={styles.console} aria-labelledby={titleId}>
      <header className={styles.header}>
        <div>
          <h1 id={titleId} className={styles.title}>
            System health
          </h1>
          <p className={styles.subtitle}>
            Whether docforum-core is ready to serve, how its background jobs are doing, and anything stuck in the
            outbox.
          </p>
        </div>
        <div className={styles.refresh}>
          {/* Not a live region: announcing every 30-second poll would be noise. */}
          <p className={styles.refreshText}>
            {lastUpdated > 0 ? (
              <>
                Updated{' '}
                <time dateTime={new Date(lastUpdated).toISOString()}>
                  {new Date(lastUpdated).toLocaleTimeString('en-GB')}
                </time>
              </>
            ) : (
              'Not loaded yet'
            )}
            {fetching && ' · refreshing…'}
          </p>
          <p className={styles.refreshHint}>
            Refreshes every {REFRESH_INTERVAL_MS / 1000} seconds while this tab is visible.
          </p>
          <Button variant="secondary" onClick={refreshAll} disabled={fetching}>
            Refresh now
          </Button>
        </div>
      </header>

      <SystemOverview readiness={readiness} jobs={jobs} outbox={outbox} now={now} />
      <ReadinessPanel readiness={readiness} now={now} />
      <JobsPanel jobs={jobs} now={now} onRunNow={setRunTarget} />
      {jobs.data && <RecentFailures jobs={jobs.data} now={now} />}

      {runTarget && <RunJobDialog job={runTarget} now={now} onClose={() => setRunTarget(null)} />}
    </section>
  );
}
