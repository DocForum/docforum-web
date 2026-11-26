import { useId } from 'react';
import { Button } from '../../../components/Button';
import { useOptionalT } from '../../../i18n/useOptionalT';
import { jobHealth, jobHealthDisplay, overdueBy } from '../status';
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
  const t = useOptionalT().t;
  if (!job.nextRunAt) {
    return <>{job.running ? t('adminSystem.job.afterCurrentRun', 'After the current run') : t('adminSystem.job.notScheduled', 'Not scheduled')}</>;
  }
  if (overdueBy(job, now) > 0) {
    return (
      <span className={styles.overdue}>
        {t('adminSystem.job.wasDue', 'was due')} <TimeAgo iso={job.nextRunAt} now={now} />
      </span>
    );
  }
  return <TimeAgo iso={job.nextRunAt} now={now} />;
}

export function JobCard({ job, now, onRunNow }: JobCardProps) {
  const t = useOptionalT().t;
  const nameId = useId();
  const health = jobHealthDisplay(jobHealth(job, now), t);
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
          <dt>{t('adminSystem.job.lastSuccess', 'Last success')}</dt>
          <dd>
            {success ? (
              <>
                <TimeAgo iso={success.startedAt} now={now} />
                {success.itemsProcessed !== null && (
                  <span className={styles.factNote}>
                    {t('adminSystem.job.itemsProcessed', '{count, plural, one {# item} other {# items}} processed', {
                      count: success.itemsProcessed,
                    })}
                  </span>
                )}
              </>
            ) : (
              t('adminSystem.job.never', 'Never')
            )}
          </dd>
        </div>
        <div>
          <dt>{t('adminSystem.job.lastFailure', 'Last failure')}</dt>
          <dd className={failure ? styles.failureFact : undefined}>
            {failure ? <TimeAgo iso={failure.startedAt} now={now} /> : t('adminSystem.job.noneRecorded', 'None recorded')}
          </dd>
        </div>
        <div>
          <dt>{t('adminSystem.job.nextRun', 'Next run')}</dt>
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
          {job.running ? t('adminSystem.job.running', 'Running…') : t('adminSystem.job.runNow', 'Run now')}
        </Button>
      </div>
    </article>
  );
}
