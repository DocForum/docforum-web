import { useId } from 'react';
import type { ReactNode } from 'react';
import { useOptionalT } from '../../../i18n/useOptionalT';
import { isAuthError, isNotServed, readinessVerdict } from '../errors';
import { checksSummary, jobsOverview, jobsVerdict, outboxTone } from '../status';
import { StatusPill } from './StatusPill';
import { TimeAgo } from './TimeAgo';
import type { useJobs, useOutboxSummary, useReadiness } from '../hooks/useSystemHealth';
import type { Tone } from '../status';
import styles from './SystemHealth.module.css';

interface SystemOverviewProps {
  readiness: ReturnType<typeof useReadiness>;
  jobs: ReturnType<typeof useJobs>;
  outbox: ReturnType<typeof useOutboxSummary>;
  now: number;
}

function Tile({ label, tone, value, detail }: { label: string; tone: Tone; value: ReactNode; detail: ReactNode }) {
  const labelId = useId();
  return (
    <div className={styles.tile} role="group" aria-labelledby={labelId} data-tone={tone}>
      <p id={labelId} className={styles.tileLabel}>
        {label}
      </p>
      <div className={styles.tileValue}>{value}</div>
      <p className={styles.tileDetail}>{detail}</p>
    </div>
  );
}

/** The three answers to "is it broken?" — the panels below have the detail. */
export function SystemOverview({ readiness, jobs, outbox, now }: SystemOverviewProps) {
  const t = useOptionalT().t;
  const verdict = readinessVerdict(readiness.data?.report, readiness.error, t);

  const readinessDetail = (): string => {
    if (readiness.error) {
      // A 404/403 has its own explanation; anything else means no answer at
      // all, which is a different sentence from "the server said not ready".
      if (isNotServed(readiness.error) || isAuthError(readiness.error)) return verdict.description;
      return t('adminSystem.overview.noAnswer', 'No answer from docforum-core');
    }
    if (readiness.data) return checksSummary(readiness.data.report.checks, t);
    return t('adminSystem.overview.waiting', 'Waiting for the first answer');
  };

  let jobsTile;
  if (jobs.error && !jobs.data) {
    jobsTile = {
      tone: 'neutral' as Tone,
      value: (
        <StatusPill
          tone="neutral"
          label={isNotServed(jobs.error) ? t('adminSystem.overview.notServed', 'Not served') : t('adminSystem.overview.unavailable', 'Unavailable')}
        />
      ),
      detail: isNotServed(jobs.error)
        ? t('adminSystem.overview.jobsNotServed', 'Job history arrives with docforum-core#100')
        : t('adminSystem.overview.jobsLoadFailed', "Couldn't load the job list"),
    };
  } else if (jobs.data) {
    const overview = jobsOverview(jobs.data, now);
    const jobsDisplay = jobsVerdict(overview, t);
    jobsTile = {
      tone: jobsDisplay.tone,
      value: <StatusPill tone={jobsDisplay.tone} label={jobsDisplay.label} />,
      detail: `${t('adminSystem.overview.jobsCount', '{count, plural, one {# job} other {# jobs}}', { count: overview.total })}${
        overview.running
          ? ` · ${t('adminSystem.overview.jobsRunning', '{count, plural, one {# running} other {# running}}', { count: overview.running })}`
          : ''
      }`,
    };
  } else {
    jobsTile = {
      tone: 'neutral' as Tone,
      value: <StatusPill tone="neutral" label={t('adminSystem.overview.loading', 'Loading…')} />,
      detail: t('adminSystem.overview.fetchingJobs', 'Fetching job history'),
    };
  }

  let outboxTile;
  if (outbox.data) {
    const summary = outbox.data;
    outboxTile = {
      tone: outboxTone(summary),
      value: <span className={styles.tileCount}>{summary.deadLetterCount.toLocaleString('en-GB')}</span>,
      detail: (
        <>
          {t('adminSystem.overview.pending', '{count, plural, one {# pending} other {# pending}}', {
            count: summary.pendingCount,
          })}
          {summary.oldestPendingAt && (
            <>
              {' '}
              · {t('adminSystem.overview.oldestQueued', 'oldest queued')} <TimeAgo iso={summary.oldestPendingAt} now={now} />
            </>
          )}
          {outbox.error && ` · ${t('adminSystem.overview.couldNotRefresh', "couldn't refresh")}`}
        </>
      ),
    };
  } else if (outbox.error) {
    // "If exposed" — a 404 is an expected answer, not a fault.
    outboxTile = {
      tone: 'neutral' as Tone,
      value: (
        <StatusPill
          tone="neutral"
          label={
            isNotServed(outbox.error)
              ? t('adminSystem.overview.notExposed', 'Not exposed')
              : t('adminSystem.overview.unavailable', 'Unavailable')
          }
        />
      ),
      detail: isNotServed(outbox.error)
        ? t('adminSystem.overview.outboxNotServed', "docforum-core doesn't expose outbox stats yet (docforum-core#94)")
        : t('adminSystem.overview.outboxLoadFailed', "Couldn't load outbox stats"),
    };
  } else {
    outboxTile = {
      tone: 'neutral' as Tone,
      value: <StatusPill tone="neutral" label={t('adminSystem.overview.loading', 'Loading…')} />,
      detail: t('adminSystem.overview.fetchingOutbox', 'Fetching outbox stats'),
    };
  }

  return (
    <div className={styles.overview}>
      <Tile
        label={t('adminSystem.overview.apiReadiness', 'API readiness')}
        tone={verdict.tone}
        value={<StatusPill tone={verdict.tone} label={verdict.label} />}
        detail={readinessDetail()}
      />
      <Tile label={t('adminSystem.overview.backgroundJobs', 'Background jobs')} {...jobsTile} />
      <Tile label={t('adminSystem.overview.outboxDeadLetters', 'Outbox dead letters')} {...outboxTile} />
    </div>
  );
}
