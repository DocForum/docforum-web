import { describe, expect, it } from 'vitest';
import {
  OVERDUE_GRACE_MS,
  UNREACHABLE,
  checkDisplay,
  checkName,
  checksSummary,
  formatDuration,
  formatRelative,
  jobHealth,
  jobsOverview,
  jobsVerdict,
  outboxTone,
  overdueBy,
  readinessDisplay,
  recentFailures,
} from './status';
import { describeRun, describeRunError, readinessVerdict } from './errors';
import { ApiError } from '../../services/api-client';
import type { BackgroundJob, JobRun, ReadinessCheck, ReadinessReport } from '../../types/models';

const NOW = Date.parse('2026-10-18T12:00:00.000Z');
const MINUTE = 60_000;
const at = (offsetMs: number) => new Date(NOW + offsetMs).toISOString();

function run(overrides: Partial<JobRun> = {}): JobRun {
  return {
    id: 'run-1',
    job: 'referral-expiry',
    status: 'succeeded',
    startedAt: at(-10 * MINUTE),
    finishedAt: at(-10 * MINUTE + 1500),
    error: null,
    itemsProcessed: 3,
    trigger: 'schedule',
    ...overrides,
  };
}

function job(overrides: Partial<BackgroundJob> = {}): BackgroundJob {
  const last = run();
  return {
    name: 'referral-expiry',
    schedule: 'every 15 minutes',
    lastRun: last,
    lastSuccess: last,
    lastFailure: null,
    nextRunAt: at(5 * MINUTE),
    running: false,
    ...overrides,
  };
}

const check = (overrides: Partial<ReadinessCheck>): ReadinessCheck => ({
  name: 'database',
  status: 'pass',
  required: true,
  durationMs: 4,
  message: null,
  ...overrides,
});

describe('readiness display', () => {
  it.each([
    ['ready', 'Ready', 'ok'],
    ['degraded', 'Degraded', 'warning'],
    ['not_ready', 'Not ready', 'danger'],
  ])('shows %s as “%s”', (status, label, tone) => {
    expect(readinessDisplay(status)).toMatchObject({ label, tone });
  });

  it("falls back to Unknown for a status it doesn't know, including prototype keys", () => {
    expect(readinessDisplay('rebooting')).toMatchObject({ label: 'Unknown', tone: 'neutral' });
    expect(readinessDisplay('toString')).toMatchObject({ label: 'Unknown', tone: 'neutral' });
  });

  it('prefers an error over the last good report, so a failed poll never reads as Ready', () => {
    const report: ReadinessReport = { status: 'ready', checkedAt: at(-MINUTE), checks: [] };
    expect(readinessVerdict(report, undefined).label).toBe('Ready');
    expect(readinessVerdict(report, new TypeError('Failed to fetch'))).toBe(UNREACHABLE);
    expect(readinessVerdict(undefined, new ApiError('Bad Gateway', 502))).toBe(UNREACHABLE);
  });

  it('separates "not served yet" and "no access" from unreachable', () => {
    expect(readinessVerdict(undefined, new ApiError('Not Found', 404))).toMatchObject({ label: 'Not served', tone: 'neutral' });
    expect(readinessVerdict(undefined, new ApiError('Forbidden', 403))).toMatchObject({ label: 'No access', tone: 'danger' });
    expect(readinessVerdict(undefined, null).label).toBe('Checking…');
  });
});

describe('readiness checks', () => {
  it('names known checks and tidies unknown ones', () => {
    expect(checkName('stellar_rpc')).toBe('Stellar RPC');
    expect(checkName('migrations')).toBe('Migrations');
    expect(checkName('email_provider')).toBe('Email provider');
    expect(checkName('constructor')).toBe('Constructor');
    expect(checkName('__')).toBe('Unnamed check');
  });

  it('shows a failing required check as danger and a failing optional one as warning', () => {
    expect(checkDisplay(check({ status: 'pass' }))).toEqual({ label: 'Passing', tone: 'ok' });
    expect(checkDisplay(check({ status: 'warn' }))).toEqual({ label: 'Warning', tone: 'warning' });
    expect(checkDisplay(check({ status: 'fail', required: true }))).toEqual({ label: 'Failing', tone: 'danger' });
    expect(checkDisplay(check({ status: 'fail', required: false }))).toEqual({ label: 'Failing', tone: 'warning' });
    expect(checkDisplay(check({ status: 'exploded' as ReadinessCheck['status'] }))).toEqual({
      label: 'Unknown',
      tone: 'neutral',
    });
  });

  it('summarises which checks are unhealthy', () => {
    expect(checksSummary([check({}), check({ name: 'migrations' })])).toBe('All 2 checks passing');
    expect(checksSummary([check({}), check({ name: 'stellar_rpc', status: 'fail', required: false })])).toBe(
      'Stellar RPC failing',
    );
    expect(checksSummary([])).toBe('No individual checks reported');
  });
});

describe('job health', () => {
  it('is healthy when the last run succeeded and the next is on time', () => {
    expect(jobHealth(job(), NOW)).toBe('healthy');
  });

  it('is failing when the last run failed', () => {
    const failed = run({ status: 'failed', error: 'boom' });
    expect(jobHealth(job({ lastRun: failed, lastFailure: failed }), NOW)).toBe('failing');
  });

  it('is running while the lock is held, whatever happened before', () => {
    const failed = run({ status: 'failed' });
    expect(jobHealth(job({ running: true, lastRun: failed }), NOW)).toBe('running');
  });

  it('is overdue only once past the grace period', () => {
    expect(jobHealth(job({ nextRunAt: at(-OVERDUE_GRACE_MS + MINUTE) }), NOW)).toBe('healthy');
    expect(jobHealth(job({ nextRunAt: at(-OVERDUE_GRACE_MS - MINUTE) }), NOW)).toBe('overdue');
    expect(overdueBy(job({ nextRunAt: at(-20 * MINUTE) }), NOW)).toBe(20 * MINUTE);
  });

  it('flags a job that never ran but should have as overdue, otherwise never run', () => {
    expect(jobHealth(job({ lastRun: null, lastSuccess: null }), NOW)).toBe('never_run');
    expect(jobHealth(job({ lastRun: null, lastSuccess: null, nextRunAt: at(-60 * MINUTE) }), NOW)).toBe('overdue');
  });

  it('ignores an unparseable next run instead of calling it overdue', () => {
    expect(overdueBy(job({ nextRunAt: 'soon' }), NOW)).toBe(0);
  });

  it('counts the overview and picks the most urgent verdict', () => {
    const failed = run({ status: 'failed' });
    const jobs = [
      job(),
      job({ name: 'order-expiry', lastRun: failed, lastFailure: failed }),
      job({ name: 'slot-ttl', nextRunAt: at(-30 * MINUTE) }),
      job({ name: 'outbox-dispatch', running: true }),
    ];
    const overview = jobsOverview(jobs, NOW);
    expect(overview).toEqual({ total: 4, failing: 1, overdue: 1, running: 1 });
    expect(jobsVerdict(overview)).toEqual({ label: '1 failing', tone: 'danger' });
    expect(jobsVerdict({ total: 2, failing: 0, overdue: 2, running: 0 })).toEqual({ label: '2 overdue', tone: 'warning' });
    expect(jobsVerdict({ total: 2, failing: 0, overdue: 0, running: 1 })).toEqual({ label: 'All healthy', tone: 'ok' });
    expect(jobsVerdict({ total: 0, failing: 0, overdue: 0, running: 0 }).label).toBe('None registered');
  });
});

describe('recent failures', () => {
  it('keeps failures from the last 24 hours, newest first', () => {
    const older = run({ id: 'old', job: 'order-expiry', status: 'failed', startedAt: at(-3 * 60 * MINUTE) });
    const newer = run({ id: 'new', job: 'slot-ttl', status: 'failed', startedAt: at(-5 * MINUTE) });
    const stale = run({ id: 'stale', job: 'reminders', status: 'failed', startedAt: at(-25 * 60 * MINUTE) });

    const failures = recentFailures(
      [job({ lastFailure: older }), job({ lastFailure: null }), job({ lastFailure: newer }), job({ lastFailure: stale })],
      NOW,
    );
    expect(failures.map((failure) => failure.id)).toEqual(['new', 'old']);
  });
});

describe('outbox', () => {
  it('turns red for any dead letter', () => {
    expect(outboxTone({ pendingCount: 40, deadLetterCount: 0, oldestPendingAt: null })).toBe('ok');
    expect(outboxTone({ pendingCount: 0, deadLetterCount: 1, oldestPendingAt: null })).toBe('danger');
  });
});

describe('formatting', () => {
  it('formats relative times both ways', () => {
    expect(formatRelative(at(-30_000), NOW)).toBe('just now');
    expect(formatRelative(at(30_000), NOW)).toBe('in under a minute');
    expect(formatRelative(at(-5 * MINUTE), NOW)).toBe('5 minutes ago');
    expect(formatRelative(at(2 * 60 * MINUTE), NOW)).toBe('in 2 hours');
    expect(formatRelative(at(-26 * 60 * MINUTE), NOW)).toBe('yesterday');
    expect(formatRelative('not a date', NOW)).toBe('unknown time');
  });

  it('formats durations', () => {
    expect(formatDuration(42)).toBe('42 ms');
    expect(formatDuration(1500)).toBe('1.5 s');
    expect(formatDuration(2000)).toBe('2 s');
    expect(formatDuration(48_000)).toBe('48 s');
    expect(formatDuration(125_000)).toBe('2 min 5 s');
    expect(formatDuration(-1)).toBe('—');
  });
});

describe('run results', () => {
  it('describes a finished run with its item count and duration', () => {
    expect(describeRun(run())).toEqual({ tone: 'ok', title: 'Run finished', detail: 'Processed 3 items in 1.5 s.' });
    expect(describeRun(run({ itemsProcessed: null })).detail).toBe('Finished in 1.5 s.');
  });

  it('describes a failed run with its error', () => {
    expect(describeRun(run({ status: 'failed', error: 'RPC timeout' }))).toEqual({
      tone: 'danger',
      title: 'Run failed',
      detail: 'RPC timeout (after 1.5 s)',
    });
    expect(describeRun(run({ status: 'failed', error: '  ', finishedAt: null })).detail).toBe(
      'docforum-core recorded no error message.',
    );
  });

  it('describes a run that outlived the request', () => {
    expect(describeRun(run({ status: 'running', finishedAt: null }))).toMatchObject({ tone: 'info', title: 'Run started' });
  });

  it('explains each way the request can fail', () => {
    expect(describeRunError(new ApiError('Locked', 409), 'slot-ttl')).toMatchObject({ title: 'Already running' });
    expect(describeRunError(new ApiError('Not Found', 404), 'slot-ttl')).toMatchObject({ title: 'Job not found' });
    expect(describeRunError(new ApiError('Forbidden', 403), 'slot-ttl')).toMatchObject({ title: 'Not allowed' });
    expect(describeRunError(new ApiError('Job is disabled', 422), 'slot-ttl')).toMatchObject({
      title: 'Run not started',
      detail: 'docforum-core refused the run (422): Job is disabled',
    });
    expect(describeRunError(new TypeError('Failed to fetch'), 'slot-ttl')).toMatchObject({ title: "Couldn't confirm" });
  });
});
