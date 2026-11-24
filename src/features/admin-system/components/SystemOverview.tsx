import { useId } from 'react';
import type { ReactNode } from 'react';
import { isNotServed, readinessVerdict } from '../errors';
import { UNREACHABLE, checksSummary, jobsOverview, jobsVerdict, outboxTone } from '../status';
import { StatusPill } from './StatusPill';
import { TimeAgo } from './TimeAgo';
import type { useJobs, useOutboxDeadLetters, useReadiness } from '../hooks/useSystemHealth';
import type { Tone } from '../status';
import styles from './SystemHealth.module.css';

interface SystemOverviewProps {
  readiness: ReturnType<typeof useReadiness>;
  jobs: ReturnType<typeof useJobs>;
  outbox: ReturnType<typeof useOutboxDeadLetters>;
  now: number;
}

function Tile({
  label,
  tone,
  value,
  detail,
  children,
}: {
  label: string;
  tone: Tone;
  value: ReactNode;
  detail: ReactNode;
  children?: ReactNode;
}) {
  const labelId = useId();
  return (
    <div className={styles.tile} role="group" aria-labelledby={labelId} data-tone={tone}>
      <p id={labelId} className={styles.tileLabel}>
        {label}
      </p>
      <div className={styles.tileValue}>{value}</div>
      <p className={styles.tileDetail}>{detail}</p>
      {children}
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
    const deadLetters = outbox.data;
    const count = deadLetters.items.length;
    outboxTile = {
      tone: outboxTone(deadLetters),
      value: (
        <span className={styles.tileCount}>
          {count === 50 ? '50+' : count.toLocaleString('en-GB')}
        </span>
      ),
      detail: (
        <>
          {count === 0 ? 'None' : 'Most recent dead letters'}
          {outbox.error && " · couldn't refresh"}
        </>
      ),
      children: count > 0 && (
        <ul className={styles.deadLetters} aria-label="Recent outbox dead letters">
          {deadLetters.items.slice(0, 5).map((item) => (
            <li className={styles.deadLetter} key={item.id}>
              <span className={styles.deadLetterType}>{item.type}</span>
              <span>{item.attempts} attempts</span>
              <code>{item.lastError ?? '—'}</code>
              <TimeAgo iso={item.deadLetteredAt} now={now} />
            </li>
          ))}
        </ul>
      ),
    };
  } else if (outbox.error) {
    // "If exposed" — a 404 is an expected answer, not a fault.
    outboxTile = {
      tone: 'neutral' as Tone,
      value: <StatusPill tone="neutral" label={isNotServed(outbox.error) ? 'Not exposed' : 'Unavailable'} />,
      detail: isNotServed(outbox.error)
        ? "This docforum-core version doesn't expose dead-letter details."
        : "Couldn't load outbox dead letters",
    };
  } else {
    outboxTile = { tone: 'neutral' as Tone, value: <StatusPill tone="neutral" label="Loading…" />, detail: 'Fetching outbox dead letters' };
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
