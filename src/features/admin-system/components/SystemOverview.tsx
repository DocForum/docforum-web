import { useId } from 'react';
import type { ReactNode } from 'react';
import { isNotServed, readinessVerdict } from '../errors';
import { UNREACHABLE, checksSummary, jobsOverview, jobsVerdict, outboxTone } from '../status';
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

function readinessDetail(readiness: ReturnType<typeof useReadiness>): string {
  const verdict = readinessVerdict(readiness.data?.report, readiness.error);
  if (verdict === UNREACHABLE) return 'No answer from docforum-core';
  if (readiness.error) return verdict.description;
  if (readiness.data) return checksSummary(readiness.data.report.checks);
  return 'Waiting for the first answer';
}

/** The three answers to "is it broken?" — the panels below have the detail. */
export function SystemOverview({ readiness, jobs, outbox, now }: SystemOverviewProps) {
  const verdict = readinessVerdict(readiness.data?.report, readiness.error);

  let jobsTile;
  if (jobs.error && !jobs.data) {
    jobsTile = {
      tone: 'neutral' as Tone,
      value: <StatusPill tone="neutral" label={isNotServed(jobs.error) ? 'Not served' : 'Unavailable'} />,
      detail: isNotServed(jobs.error) ? 'Job history arrives with docforum-core#100' : "Couldn't load the job list",
    };
  } else if (jobs.data) {
    const overview = jobsOverview(jobs.data, now);
    const jobsDisplay = jobsVerdict(overview);
    jobsTile = {
      tone: jobsDisplay.tone,
      value: <StatusPill tone={jobsDisplay.tone} label={jobsDisplay.label} />,
      detail: `${overview.total} ${overview.total === 1 ? 'job' : 'jobs'}${overview.running ? ` · ${overview.running} running` : ''}`,
    };
  } else {
    jobsTile = { tone: 'neutral' as Tone, value: <StatusPill tone="neutral" label="Loading…" />, detail: 'Fetching job history' };
  }

  let outboxTile;
  if (outbox.data) {
    const summary = outbox.data;
    outboxTile = {
      tone: outboxTone(summary),
      value: <span className={styles.tileCount}>{summary.deadLetterCount.toLocaleString('en-GB')}</span>,
      detail: (
        <>
          {summary.pendingCount.toLocaleString('en-GB')} pending
          {summary.oldestPendingAt && (
            <>
              {' '}
              · oldest queued <TimeAgo iso={summary.oldestPendingAt} now={now} />
            </>
          )}
          {outbox.error && " · couldn't refresh"}
        </>
      ),
    };
  } else if (outbox.error) {
    // "If exposed" — a 404 is an expected answer, not a fault.
    outboxTile = {
      tone: 'neutral' as Tone,
      value: <StatusPill tone="neutral" label={isNotServed(outbox.error) ? 'Not exposed' : 'Unavailable'} />,
      detail: isNotServed(outbox.error)
        ? "docforum-core doesn't expose outbox stats yet (docforum-core#94)"
        : "Couldn't load outbox stats",
    };
  } else {
    outboxTile = { tone: 'neutral' as Tone, value: <StatusPill tone="neutral" label="Loading…" />, detail: 'Fetching outbox stats' };
  }

  return (
    <div className={styles.overview}>
      <Tile
        label="API readiness"
        tone={verdict.tone}
        value={<StatusPill tone={verdict.tone} label={verdict.label} />}
        detail={readinessDetail(readiness)}
      />
      <Tile label="Background jobs" {...jobsTile} />
      <Tile label="Outbox dead letters" {...outboxTile} />
    </div>
  );
}
