import { useId } from 'react';
import { Button } from '../../../components/Button';
import { Spinner } from '../../../components/Spinner';
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
    body = (
      <div className={styles.status} role="status">
        <Spinner size={20} />
        <span>Loading background jobs…</span>
      </div>
    );
  } else if (jobs.error && !list) {
    body = (
      <div className={isNotServed(jobs.error) ? styles.notServed : styles.errorBox} role="alert">
        <p>{describeLoadError(jobs.error, 'jobs')}</p>
        <Button variant="secondary" onClick={() => void jobs.refetch()} loading={jobs.isFetching}>
          Try again
        </Button>
      </div>
    );
  } else if (list && list.length === 0) {
    body = <p className={styles.emptyInline}>docforum-core has no background jobs registered.</p>;
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
