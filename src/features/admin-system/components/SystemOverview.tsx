import { useId } from 'react';
import type { ReactNode } from 'react';
import { useOptionalT } from '../../../i18n/useOptionalT';
import { isAuthError, isNotServed, readinessVerdict } from '../errors';
import { checksSummary, jobsOverview, jobsVerdict, outboxTone } from '../status';
import { StatusPill } from './StatusPill';
import { TimeAgo } from './TimeAgo';
import type { useJobs, useOutboxDeadLetters, useReadiness } from '../hooks/useSystemHealth';
import type { Tone } from '../status';
import styles from './SystemHealth.module.css';
import { formatLocaleNumber } from '../../../i18n/format';

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
    const deadLetters = outbox.data;
    const count = deadLetters.items.length;
    outboxTile = {
      tone: outboxTone(deadLetters),
      // The list is capped at the requested page size (50), so a full page
      // means "at least this many".
      value: <span className={styles.tileCount}>{count === 50 ? '50+' : formatLocaleNumber(count, 'en-GB')}</span>,
      detail: (
        <>
          {count === 0
            ? t('adminSystem.overview.deadLettersNone', 'None')
            : t('adminSystem.overview.deadLettersRecent', 'Most recent dead letters')}
          {outbox.error && ` · ${t('adminSystem.overview.couldNotRefresh', "couldn't refresh")}`}
        </>
      ),
      children: count > 0 && (
        <ul
          className={styles.deadLetters}
          aria-label={t('adminSystem.overview.deadLettersListLabel', 'Recent outbox dead letters')}
        >
          {deadLetters.items.slice(0, 5).map((item) => (
            <li className={styles.deadLetter} key={item.id}>
              <span className={styles.deadLetterType}>{item.type}</span>
              <span>
                {t('adminSystem.overview.deadLetterAttempts', '{count, plural, one {# attempt} other {# attempts}}', {
                  count: item.attempts,
                })}
              </span>
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
        ? t('adminSystem.overview.outboxNotServed', "This docforum-core version doesn't expose dead-letter details.")
        : t('adminSystem.overview.outboxLoadFailed', "Couldn't load outbox dead letters"),
    };
  } else {
    outboxTile = {
      tone: 'neutral' as Tone,
      value: <StatusPill tone="neutral" label={t('adminSystem.overview.loading', 'Loading…')} />,
      detail: t('adminSystem.overview.fetchingOutbox', 'Fetching outbox dead letters'),
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
