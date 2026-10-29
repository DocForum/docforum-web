import { useId } from 'react';
import { EmptyState } from '../../../components/states/EmptyState';
import { InlineError } from '../../../components/states/InlineError';
import { Skeleton } from '../../../components/states/Skeleton';
import { describeLoadError, isNotServed } from '../errors';
import { JobCard } from './JobCard';
import { TimeAgo } from './TimeAgo';
import type { useJobs } from '../hooks/useSystemHealth';
import type { BackgroundJob } from '../../../types/models';
import styles from './SystemHealth.module.css';

interface JobsPanelProps {
  jobs: ReturnType<typeof useJobs>;
  now: number;
  onRunNow: (job: BackgroundJob) => void;
}

export function JobsPanel({ jobs, now, onRunNow }: JobsPanelProps) {
  const titleId = useId();
  const list = jobs.data;

  let body;
  if (jobs.isLoading) {
    body = <Skeleton lines={3} height="2.5rem" label="Loading background jobs" />;
  } else if (jobs.error && !list) {
    body = (
      <InlineError
        title={isNotServed(jobs.error) ? 'Not exposed by docforum-core yet' : "The job list couldn't be loaded"}
        message={describeLoadError(jobs.error, 'jobs')}
        onRetry={() => void jobs.refetch()}
      />
    );
  } else if (list && list.length === 0) {
    body = (
      <EmptyState
        title="docforum-core has no background jobs registered."
        description="Scheduled jobs (expiry sweeps, reminder dispatch) appear here once the backend registers them."
        action={{ label: 'Refresh jobs', onClick: () => void jobs.refetch() }}
      />
    );
  } else if (list) {
    body = (
      <ul className={styles.jobs}>
        {list.map((job) => (
          <li key={job.name}>
            <JobCard job={job} now={now} onRunNow={onRunNow} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section className={styles.panel} aria-labelledby={titleId}>
      <div className={styles.panelHead}>
        <h2 id={titleId} className={styles.panelTitle}>
          Background jobs
        </h2>
      </div>
      {/* A failed poll keeps the last list on screen, but says it's stale. */}
      {jobs.error && list && (
        <p className={styles.staleBanner} role="alert">
          Couldn't refresh the job list — showing what docforum-core reported{' '}
          <TimeAgo iso={new Date(jobs.dataUpdatedAt).toISOString()} now={now} />.
        </p>
      )}
      {body}
    </section>
  );
}
