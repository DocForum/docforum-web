import { useId } from 'react';
import { Button } from '../../../components/Button';
import { JOB_HEALTH, jobHealth, overdueBy } from '../status';
import { StatusPill } from './StatusPill';
import { TimeAgo } from './TimeAgo';
import type { BackgroundJob } from '../../../types/models';
import styles from './SystemHealth.module.css';

interface JobCardProps {
  job: BackgroundJob;
  now: number;
  onRunNow: (job: BackgroundJob) => void;
}

function NextRun({ job, now }: { job: BackgroundJob; now: number }) {
  if (!job.nextRunAt) return <>{job.running ? 'After the current run' : 'Not scheduled'}</>;
  if (overdueBy(job, now) > 0) {
    return (
      <span className={styles.overdue}>
        was due <TimeAgo iso={job.nextRunAt} now={now} />
      </span>
    );
  }
  return <TimeAgo iso={job.nextRunAt} now={now} />;
}

export function JobCard({ job, now, onRunNow }: JobCardProps) {
  const nameId = useId();
  const health = JOB_HEALTH[jobHealth(job, now)];
  const success = job.lastSuccess;
  const failure = job.lastFailure;

  return (
    <article className={styles.job} aria-labelledby={nameId} data-tone={health.tone}>
      <div className={styles.jobTop}>
        <div>
          <h3 id={nameId} className={styles.jobName}>
            {job.name}
          </h3>
          <p className={styles.schedule}>{job.schedule}</p>
        </div>
        <StatusPill tone={health.tone} label={health.label} />
      </div>

      <dl className={styles.facts}>
        <div>
          <dt>Last success</dt>
          <dd>
            {success ? (
              <>
                <TimeAgo iso={success.startedAt} now={now} />
                {success.itemsProcessed !== null && (
                  <span className={styles.factNote}>
                    {success.itemsProcessed} {success.itemsProcessed === 1 ? 'item' : 'items'} processed
                  </span>
                )}
              </>
            ) : (
              'Never'
            )}
          </dd>
        </div>
        <div>
          <dt>Last failure</dt>
          <dd className={failure ? styles.failureFact : undefined}>
            {failure ? <TimeAgo iso={failure.startedAt} now={now} /> : 'None recorded'}
          </dd>
        </div>
        <div>
          <dt>Next run</dt>
          <dd>
            <NextRun job={job} now={now} />
          </dd>
        </div>
      </dl>

      <div className={styles.jobActions}>
        <Button
          variant="secondary"
          onClick={() => onRunNow(job)}
          disabled={job.running}
          aria-describedby={nameId}
        >
          {job.running ? 'Running…' : 'Run now'}
        </Button>
      </div>
    </article>
  );
}
