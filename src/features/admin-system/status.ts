import type { BackgroundJob, JobRun, OutboxSummary, ReadinessCheck, ReadinessStatus } from '../../types/models';

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

const READINESS: Record<ReadinessStatus, StatusDisplay> = {
  ready: {
    label: 'Ready',
    tone: 'ok',
    description: 'Every readiness check is passing. docforum-core is serving traffic normally.',
  },
  degraded: {
    label: 'Degraded',
    tone: 'warning',
    description: 'An optional dependency is failing. Most of the API works; the affected features do not.',
  },
  not_ready: {
    label: 'Not ready',
    tone: 'danger',
    description: 'A required check is failing. Requests that touch it will fail until it recovers.',
  },
};

export function readinessDisplay(status: string): StatusDisplay {
  return (
    lookup(READINESS, status) ?? {
      label: 'Unknown',
      tone: 'neutral',
      description: `docforum-core reported a status this page doesn't recognise (“${status}”).`,
    }
  );
}

export const UNREACHABLE: StatusDisplay = {
  label: 'Unreachable',
  tone: 'danger',
  description: "The readiness endpoint didn't answer. The backend may be down or still cold-starting.",
};

const CHECK_NAMES: Record<string, string> = {
  database: 'Database',
  migrations: 'Migrations',
  config: 'Required config',
  stellar_rpc: 'Stellar RPC',
};

/** Known checks get a proper name; anything new is shown as sent, tidied up. */
export function checkName(name: string): string {
  const known = lookup(CHECK_NAMES, name);
  if (known) return known;
  const words = name.replace(/[_-]+/g, ' ').trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : 'Unnamed check';
}

export function checkDisplay(check: ReadinessCheck): Pick<StatusDisplay, 'label' | 'tone'> {
  switch (check.status) {
    case 'pass':
      return { label: 'Passing', tone: 'ok' };
    case 'warn':
      return { label: 'Warning', tone: 'warning' };
    case 'fail':
      // A failing optional check degrades rather than takes the API out.
      return { label: 'Failing', tone: check.required ? 'danger' : 'warning' };
    default:
      return { label: 'Unknown', tone: 'neutral' };
  }
}

export type JobHealth = 'running' | 'failing' | 'overdue' | 'healthy' | 'never_run';

export const JOB_HEALTH: Record<JobHealth, Pick<StatusDisplay, 'label' | 'tone'>> = {
  running: { label: 'Running', tone: 'info' },
  failing: { label: 'Last run failed', tone: 'danger' },
  overdue: { label: 'Overdue', tone: 'warning' },
  healthy: { label: 'Healthy', tone: 'ok' },
  never_run: { label: 'Never run', tone: 'neutral' },
};

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

export function jobsVerdict(overview: JobsOverview): Pick<StatusDisplay, 'label' | 'tone'> {
  if (overview.total === 0) return { label: 'None registered', tone: 'neutral' };
  if (overview.failing > 0) return { label: `${overview.failing} failing`, tone: 'danger' };
  if (overview.overdue > 0) return { label: `${overview.overdue} overdue`, tone: 'warning' };
  return { label: 'All healthy', tone: 'ok' };
}

/** "All 4 checks passing", or which ones aren't. */
export function checksSummary(checks: ReadinessCheck[]): string {
  const unhealthy = checks.filter((check) => check.status !== 'pass');
  if (checks.length === 0) return 'No individual checks reported';
  if (unhealthy.length === 0) return checks.length === 1 ? 'The only check is passing' : `All ${checks.length} checks passing`;
  return unhealthy.map((check) => `${checkName(check.name)} ${checkDisplay(check).label.toLowerCase()}`).join(', ');
}

/** Any dead letter needs a human: it already exhausted its retries. */
export function outboxTone(summary: OutboxSummary): Tone {
  return summary.deadLetterCount > 0 ? 'danger' : 'ok';
}

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['day', 24 * 60 * 60_000],
  ['hour', 60 * 60_000],
  ['minute', 60_000],
];

/** "3 minutes ago", "in 2 hours", "just now" — or "unknown time" for garbage. */
export function formatRelative(iso: string, now: number): string {
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return 'unknown time';
  const delta = at - now;
  if (Math.abs(delta) < 60_000) return delta < 0 ? 'just now' : 'in under a minute';
  for (const [unit, size] of UNITS) {
    if (Math.abs(delta) >= size) return relative.format(Math.trunc(delta / size), unit);
  }
  return relative.format(Math.trunc(delta / 60_000), 'minute');
}

/** Absolute timestamp for tooltips and `<time dateTime>`. */
export function formatTimestamp(iso: string): string {
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return iso;
  return new Date(at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'medium' });
}

export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  // One decimal under ten seconds ("1.5 s"), but never a trailing ".0".
  if (ms < 10_000) return `${Math.round(ms / 100) / 10} s`;
  if (ms < 60_000) return `${Math.round(ms / 1000)} s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  return seconds > 0 ? `${minutes} min ${seconds} s` : `${minutes} min`;
}

/** Wall time of a finished run, or null while it's still going. */
export function runDuration(run: JobRun): number | null {
  if (!run.finishedAt) return null;
  const ms = Date.parse(run.finishedAt) - Date.parse(run.startedAt);
  return Number.isNaN(ms) ? null : ms;
}
