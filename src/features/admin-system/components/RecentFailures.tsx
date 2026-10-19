import { useId } from 'react';
import { recentFailures } from '../status';
import { TimeAgo } from './TimeAgo';
import type { BackgroundJob } from '../../../types/models';
import styles from './SystemHealth.module.css';

interface RecentFailuresProps {
  jobs: BackgroundJob[];
  now: number;
}

/** Built from each job's latest failure — docforum-core#100 doesn't
 * describe a run-history listing, only last success/failure per job. */
export function RecentFailures({ jobs, now }: RecentFailuresProps) {
  const titleId = useId();
  const failures = recentFailures(jobs, now);

  return (
    <section className={styles.panel} aria-labelledby={titleId}>
      <div className={styles.panelHead}>
        <h2 id={titleId} className={styles.panelTitle}>
          Recent failures
        </h2>
        <span className={styles.panelHint}>Latest failure per job, last 24 hours</span>
      </div>
      {failures.length === 0 ? (
        <p className={styles.emptyInline}>No background job has failed in the last 24 hours.</p>
      ) : (
        <ol className={styles.failures}>
          {failures.map((run) => (
            <li key={run.id} className={styles.failure}>
              <div className={styles.failureHead}>
                <span className={styles.failureJob}>{run.job}</span>
                <span className={styles.failureMeta}>
                  <TimeAgo iso={run.startedAt} now={now} /> · {run.trigger === 'manual' ? 'manual run' : 'scheduled run'}
                </span>
              </div>
              <p className={styles.failureError}>{run.error?.trim() || 'No error message recorded.'}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
