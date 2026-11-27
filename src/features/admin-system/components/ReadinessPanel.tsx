import { useId } from 'react';
import { Button } from '../../../components/Button';
import { Skeleton } from '../../../components/states/Skeleton';
import { useSlowRequestHint } from '../../../hooks/useSlowRequestHint';
import { useOptionalT } from '../../../i18n/useOptionalT';
import { readinessVerdict } from '../errors';
import {
  COLD_START_THRESHOLD_MS,
  checkDisplay,
  checkName,
  formatDuration,
  readinessDisplay,
} from '../status';
import { StatusPill } from './StatusPill';
import { TimeAgo } from './TimeAgo';
import type { useReadiness } from '../hooks/useSystemHealth';
import styles from './SystemHealth.module.css';

interface ReadinessPanelProps {
  readiness: ReturnType<typeof useReadiness>;
  now: number;
}

export function ReadinessPanel({ readiness, now }: ReadinessPanelProps) {
  const t = useOptionalT().t;
  const titleId = useId();
  const slow = useSlowRequestHint(readiness.isLoading);
  const timed = readiness.data;
  const verdict = readinessVerdict(timed?.report, readiness.error, t);

  let body;
  if (readiness.isLoading) {
    body = (
      <div>
        <Skeleton lines={3} height="1.75rem" label={t('adminSystem.readiness.checking.loading', 'Checking readiness')} />
        {slow && (
          <p className={styles.staleNote}>
            {t(
              'adminSystem.readiness.slow',
              'Still waiting — the preview backend sleeps when idle and can take about a minute to wake up.',
            )}
          </p>
        )}
      </div>
    );
  } else if (readiness.error) {
    body = (
      <div className={verdict.tone === 'neutral' ? styles.notServed : styles.errorBox} role="alert">
        <p>{verdict.description}</p>
        {timed && (
          <p className={styles.staleNote}>
            {t('adminSystem.readiness.lastAnswered', 'The last check that answered said')}{' '}
            “{readinessDisplay(timed.report.status, t).label}”,{' '}
            <TimeAgo iso={timed.report.checkedAt} now={now} />.
          </p>
        )}
        <Button variant="secondary" onClick={() => void readiness.refetch()} loading={readiness.isFetching}>
          {t('adminSystem.readiness.checkAgain', 'Check again')}
        </Button>
      </div>
    );
  } else if (timed) {
    const { report, respondedInMs } = timed;
    body = (
      <>
        <p className={styles.verdictText}>{verdict.description}</p>
        <p className={styles.meta}>
          {t('adminSystem.readiness.checked', 'Checked')}{' '}
          <TimeAgo iso={report.checkedAt} now={now} /> ·{' '}
          {t('adminSystem.readiness.respondedIn', 'responded in {duration}', {
            duration: formatDuration(respondedInMs, t),
          })}
          {respondedInMs >= COLD_START_THRESHOLD_MS && (
            <span className={styles.coldStart}>
              {t(
                'adminSystem.readiness.coldStart',
                ' — slow enough to be a cold start of the free-tier backend',
              )}
            </span>
          )}
        </p>
        {report.checks.length === 0 ? (
          <p className={styles.emptyInline}>
            {t('adminSystem.readiness.noChecks', 'docforum-core returned no individual checks.')}
          </p>
        ) : (
          <ul className={styles.checks}>
            {report.checks.map((check) => {
              const display = checkDisplay(check, t);
              return (
                <li key={check.name} className={styles.check} data-tone={display.tone}>
                  <div className={styles.checkHead}>
                    <span className={styles.checkName}>{checkName(check.name, t)}</span>
                    <span className={styles.checkKind}>
                      {check.required
                        ? t('adminSystem.readiness.required', 'Required')
                        : t('adminSystem.readiness.optional', 'Optional')}
                    </span>
                  </div>
                  <StatusPill tone={display.tone} label={display.label} />
                  <span className={styles.checkDuration}>
                    {check.durationMs === null ? '—' : formatDuration(check.durationMs, t)}
                  </span>
                  {check.message && <p className={styles.checkMessage}>{check.message}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </>
    );
  }

  return (
    <section className={styles.panel} aria-labelledby={titleId}>
      <div className={styles.panelHead}>
        <h2 id={titleId} className={styles.panelTitle}>
          {t('adminSystem.readiness.title', 'Readiness checks')}
        </h2>
        {!readiness.isLoading && <StatusPill tone={verdict.tone} label={verdict.label} />}
      </div>
      {body}
    </section>
  );
}
