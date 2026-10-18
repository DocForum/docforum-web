import { useId } from 'react';
import { Button } from '../../../components/Button';
import { Spinner } from '../../../components/Spinner';
import { useSlowRequestHint } from '../../../hooks/useSlowRequestHint';
import { readinessVerdict } from '../errors';
import { COLD_START_THRESHOLD_MS, checkDisplay, checkName, formatDuration, readinessDisplay } from '../status';
import { StatusPill } from './StatusPill';
import { TimeAgo } from './TimeAgo';
import type { useReadiness } from '../hooks/useSystemHealth';
import styles from './SystemHealth.module.css';

interface ReadinessPanelProps {
  readiness: ReturnType<typeof useReadiness>;
  now: number;
}

export function ReadinessPanel({ readiness, now }: ReadinessPanelProps) {
  const titleId = useId();
  const slow = useSlowRequestHint(readiness.isLoading);
  const timed = readiness.data;
  const verdict = readinessVerdict(timed?.report, readiness.error);

  let body;
  if (readiness.isLoading) {
    body = (
      <div className={styles.status} role="status">
        <Spinner size={20} />
        <span>
          {slow
            ? 'Still waiting — the preview backend sleeps when idle and can take about a minute to wake up.'
            : 'Checking readiness…'}
        </span>
      </div>
    );
  } else if (readiness.error) {
    body = (
      <div className={verdict.tone === 'neutral' ? styles.notServed : styles.errorBox} role="alert">
        <p>{verdict.description}</p>
        {timed && (
          <p className={styles.staleNote}>
            The last check that answered said “{readinessDisplay(timed.report.status).label}”,{' '}
            <TimeAgo iso={timed.report.checkedAt} now={now} />.
          </p>
        )}
        <Button variant="secondary" onClick={() => void readiness.refetch()} loading={readiness.isFetching}>
          Check again
        </Button>
      </div>
    );
  } else if (timed) {
    const { report, respondedInMs } = timed;
    body = (
      <>
        <p className={styles.verdictText}>{verdict.description}</p>
        <p className={styles.meta}>
          Checked <TimeAgo iso={report.checkedAt} now={now} /> · responded in {formatDuration(respondedInMs)}
          {respondedInMs >= COLD_START_THRESHOLD_MS && (
            <span className={styles.coldStart}> — slow enough to be a cold start of the free-tier backend</span>
          )}
        </p>
        {report.checks.length === 0 ? (
          <p className={styles.emptyInline}>docforum-core returned no individual checks.</p>
        ) : (
          <ul className={styles.checks}>
            {report.checks.map((check) => {
              const display = checkDisplay(check);
              return (
                <li key={check.name} className={styles.check} data-tone={display.tone}>
                  <div className={styles.checkHead}>
                    <span className={styles.checkName}>{checkName(check.name)}</span>
                    <span className={styles.checkKind}>{check.required ? 'Required' : 'Optional'}</span>
                  </div>
                  <StatusPill tone={display.tone} label={display.label} />
                  <span className={styles.checkDuration}>
                    {check.durationMs === null ? '—' : formatDuration(check.durationMs)}
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
          Readiness checks
        </h2>
        {!readiness.isLoading && <StatusPill tone={verdict.tone} label={verdict.label} />}
      </div>
      {body}
    </section>
  );
}
