import { formatDateTime } from '../../i18n/time-zone';
import { englishTranslator } from '../../i18n/englishTranslator';
import type { Translator } from '../../i18n/useT';
import type { BackgroundJob, JobRun, OutboxDeadLetters, ReadinessCheck, ReadinessStatus } from '../../types/models';

/** Every status on the page maps onto one of these, so colours mean the same
 * thing across readiness, jobs and the outbox. */
export type Tone = 'ok' | 'info' | 'warning' | 'danger' | 'neutral';

export interface StatusDisplay {
  label: string;
  tone: Tone;
  description: string;
}

/** How often the page re-polls while the tab is visible. */
export const REFRESH_INTERVAL_MS = 30_000;

/** How late a job may be before it's flagged — ticks fire on an interval, and
 * a busy instance can start one a little after `nextRunAt`. */
export const OVERDUE_GRACE_MS = 5 * 60_000;

/** Readiness answers slower than this were almost certainly a cold start. */
export const COLD_START_THRESHOLD_MS = 10_000;

/** What counts as "recent" in the failures list. */
export const RECENT_FAILURE_WINDOW_MS = 24 * 60 * 60_000;

// Hand-edited or future server values must not resolve to Object.prototype
// members ("toString", "constructor") — always go through this.
function lookup<T>(table: Record<string, T>, key: string): T | undefined {
  return Object.hasOwn(table, key) ? table[key] : undefined;
}

const READINESS_IDS: Record<ReadinessStatus, string> = {
  ready: 'ready',
  degraded: 'degraded',
  not_ready: 'notReady',
};

const READINESS_COPY: Record<ReadinessStatus, { label: string; description: string }> = {
  ready: {
    label: 'Ready',
    description: 'Every readiness check is passing. docforum-core is serving traffic normally.',
  },
  degraded: {
    label: 'Degraded',
    description: 'An optional dependency is failing. Most of the API works; the affected features do not.',
  },
  not_ready: {
    label: 'Not ready',
    description: 'A required check is failing. Requests that touch it will fail until it recovers.',
  },
};

const READINESS_TONE: Record<ReadinessStatus, Tone> = {
  ready: 'ok',
  degraded: 'warning',
  not_ready: 'danger',
};

export function readinessDisplay(status: string, t: Translator = englishTranslator): StatusDisplay {
  const known = lookup(READINESS_COPY, status);
  const key = lookup(READINESS_IDS, status);
  if (known && key) {
    return {
      label: t(`adminSystem.readiness.${key}.label`, known.label),
      tone: READINESS_TONE[status as ReadinessStatus],
      description: t(`adminSystem.readiness.${key}.description`, known.description),
    };
  }
  return {
    label: t('adminSystem.readiness.unknown.label', 'Unknown'),
    tone: 'neutral',
    description: t(
      'adminSystem.readiness.unknown.description',
      'docforum-core reported a status this page doesn’t recognise (“{status}”).',
      { status },
    ),
  };
}

export function unreachableDisplay(t: Translator = englishTranslator): StatusDisplay {
  return {
    label: t('adminSystem.readiness.unreachable.label', 'Unreachable'),
    tone: 'danger',
    description: t(
      'adminSystem.readiness.unreachable.description',
      "The readiness endpoint didn't answer. The backend may be down or still cold-starting.",
    ),
  };
}

/** Kept as a value for callers/tests that compare against it; the labels are
 * English because `t` cannot be captured per locale in a constant. */
export const UNREACHABLE: StatusDisplay = unreachableDisplay();

const CHECK_NAMES: Record<string, { id: string; label: string }> = {
  database: { id: 'database', label: 'Database' },
  migrations: { id: 'migrations', label: 'Migrations' },
  config: { id: 'config', label: 'Required config' },
  stellar_rpc: { id: 'stellarRpc', label: 'Stellar RPC' },
};

/** Known checks get a proper name; anything new is shown as sent, tidied up. */
export function checkName(name: string, t: Translator = englishTranslator): string {
  const known = lookup(CHECK_NAMES, name);
  if (known) return t(`adminSystem.checkName.${known.id}`, known.label);
  const words = name.replace(/[_-]+/g, ' ').trim();
  return words
    ? words.charAt(0).toUpperCase() + words.slice(1)
    : t('adminSystem.checkName.unnamed', 'Unnamed check');
}

export function checkDisplay(
  check: ReadinessCheck,
  t: Translator = englishTranslator,
): Pick<StatusDisplay, 'label' | 'tone'> {
  switch (check.status) {
    case 'pass':
      return { label: t('adminSystem.checkStatus.passing', 'Passing'), tone: 'ok' };
    case 'warn':
      return { label: t('adminSystem.checkStatus.warning', 'Warning'), tone: 'warning' };
    case 'fail':
      // A failing optional check degrades rather than takes the API out.
      return {
        label: t('adminSystem.checkStatus.failing', 'Failing'),
        tone: check.required ? 'danger' : 'warning',
      };
    default:
      return { label: t('adminSystem.checkStatus.unknown', 'Unknown'), tone: 'neutral' };
  }
}

export type JobHealth = 'running' | 'failing' | 'overdue' | 'healthy' | 'never_run';

const JOB_HEALTH_COPY: Record<JobHealth, { label: string; tone: Tone }> = {
  running: { label: 'Running', tone: 'info' },
  failing: { label: 'Last run failed', tone: 'danger' },
  overdue: { label: 'Overdue', tone: 'warning' },
  healthy: { label: 'Healthy', tone: 'ok' },
  never_run: { label: 'Never run', tone: 'neutral' },
};

export function jobHealthDisplay(
  health: JobHealth,
  t: Translator = englishTranslator,
): Pick<StatusDisplay, 'label' | 'tone'> {
  const copy = JOB_HEALTH_COPY[health];
  return { label: t(`adminSystem.jobHealth.${health}`, copy.label), tone: copy.tone };
}

/** English defaults, kept for callers that need the whole table at once. */
export const JOB_HEALTH: Record<JobHealth, Pick<StatusDisplay, 'label' | 'tone'>> =
  Object.fromEntries(
    (Object.keys(JOB_HEALTH_COPY) as JobHealth[]).map((health) => [health, jobHealthDisplay(health)]),
  ) as Record<JobHealth, Pick<StatusDisplay, 'label' | 'tone'>>;

/** Milliseconds past `nextRunAt` beyond the grace period, or 0 if on time. */
export function overdueBy(job: BackgroundJob, now: number): number {
  if (!job.nextRunAt) return 0;
  const due = Date.parse(job.nextRunAt);
  if (Number.isNaN(due)) return 0;
  const late = now - due;
  return late > OVERDUE_GRACE_MS ? late : 0;
}

/**
 * A single verdict per job, most urgent first. A failed last run outranks
 * lateness — the failure is the more useful thing to read — and the Next run
 * column still says when a failing job is also late.
 */
export function jobHealth(job: BackgroundJob, now: number): JobHealth {
  if (job.running) return 'running';
  if (job.lastRun?.status === 'failed') return 'failing';
  if (overdueBy(job, now) > 0) return 'overdue';
  if (!job.lastRun) return 'never_run';
  return 'healthy';
}

/** The latest failure of each job inside the window, newest first. */
export function recentFailures(jobs: BackgroundJob[], now: number, windowMs = RECENT_FAILURE_WINDOW_MS): JobRun[] {
  return jobs
    .map((job) => job.lastFailure)
    .filter((run): run is JobRun => {
      if (!run) return false;
      const started = Date.parse(run.startedAt);
      return !Number.isNaN(started) && now - started <= windowMs;
    })
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
}

export interface JobsOverview {
  total: number;
  failing: number;
  overdue: number;
  running: number;
}

export function jobsOverview(jobs: BackgroundJob[], now: number): JobsOverview {
  const overview: JobsOverview = { total: jobs.length, failing: 0, overdue: 0, running: 0 };
  for (const job of jobs) {
    const health = jobHealth(job, now);
    if (health === 'failing') overview.failing += 1;
    else if (health === 'overdue') overview.overdue += 1;
    else if (health === 'running') overview.running += 1;
  }
  return overview;
}

export function jobsVerdict(
  overview: JobsOverview,
  t: Translator = englishTranslator,
): Pick<StatusDisplay, 'label' | 'tone'> {
  if (overview.total === 0) return { label: t('adminSystem.jobsVerdict.none', 'None registered'), tone: 'neutral' };
  if (overview.failing > 0) {
    return {
      label: t(
        'adminSystem.jobsVerdict.failing',
        '{count, plural, one {# failing} other {# failing}}',
        { count: overview.failing },
      ),
      tone: 'danger',
    };
  }
  if (overview.overdue > 0) {
    return {
      label: t(
        'adminSystem.jobsVerdict.overdue',
        '{count, plural, one {# overdue} other {# overdue}}',
        { count: overview.overdue },
      ),
      tone: 'warning',
    };
  }
  return { label: t('adminSystem.jobsVerdict.healthy', 'All healthy'), tone: 'ok' };
}

/** "All 4 checks passing", or which ones aren't. */
export function checksSummary(checks: ReadinessCheck[], t: Translator = englishTranslator): string {
  const unhealthy = checks.filter((check) => check.status !== 'pass');
  if (checks.length === 0) {
    return t('adminSystem.checks.noneReported', 'No individual checks reported');
  }
  if (unhealthy.length === 0) {
    return checks.length === 1
      ? t('adminSystem.checks.onlyPassing', 'The only check is passing')
      : t('adminSystem.checks.allPassing', 'All {count} checks passing', { count: checks.length });
  }
  return unhealthy
    .map(
      (check) =>
        `${checkName(check.name, t)} ${checkDisplay(check, t).label.toLowerCase()}`,
    )
    .join(', ');
}

/** Any dead letter needs a human: it already exhausted its retries. */
export function outboxTone(deadLetters: OutboxDeadLetters): Tone {
  return deadLetters.items.length > 0 ? 'danger' : 'ok';
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['day', 24 * 60 * 60_000],
  ['hour', 60 * 60_000],
  ['minute', 60_000],
];

/** "3 minutes ago", "in 2 hours", "just now" — or "unknown time" for garbage.
 * `Intl.RelativeTimeFormat` handles the wording and plurals per locale; only
 * the two sub-minute phrases and the invalid-timestamp case need a catalogue. */
export function formatRelative(
  iso: string,
  now: number,
  locale: string = 'en',
  t: Translator = englishTranslator,
): string {
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return t('adminSystem.relative.unknown', 'unknown time');
  const delta = at - now;
  if (Math.abs(delta) < 60_000) {
    return delta < 0
      ? t('adminSystem.relative.justNow', 'just now')
      : t('adminSystem.relative.underMinute', 'in under a minute');
  }
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  for (const [unit, size] of UNITS) {
    if (Math.abs(delta) >= size) return relative.format(Math.trunc(delta / size), unit);
  }
  return relative.format(Math.trunc(delta / 60_000), 'minute');
}

/** Absolute timestamp for tooltips and `<time dateTime>`, in the user's zone. */
export function formatTimestamp(iso: string, timeZone: string): string {
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return iso;
  return formatDateTime(at, timeZone, { dateStyle: 'medium', timeStyle: 'medium' }, 'en-GB');
}

export function formatDuration(ms: number, t: Translator = englishTranslator): string {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  if (ms < 1000) {
    return t('adminSystem.duration.milliseconds', '{milliseconds} ms', { milliseconds: Math.round(ms) });
  }
  // One decimal under ten seconds ("1.5 s"), but never a trailing ".0".
  if (ms < 10_000) {
    return t('adminSystem.duration.secondsExact', '{seconds} s', {
      seconds: Math.round(ms / 100) / 10,
    });
  }
  if (ms < 60_000) {
    return t('adminSystem.duration.seconds', '{seconds} s', { seconds: Math.round(ms / 1000) });
  }
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  return seconds > 0
    ? t('adminSystem.duration.minutesSeconds', '{minutes} min {seconds} s', { minutes, seconds })
    : t('adminSystem.duration.minutes', '{minutes} min', { minutes });
}

/** Wall time of a finished run, or null while it's still going. */
export function runDuration(run: JobRun): number | null {
  if (!run.finishedAt) return null;
  const ms = Date.parse(run.finishedAt) - Date.parse(run.startedAt);
  return Number.isNaN(ms) ? null : ms;
}
