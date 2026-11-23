// --- Phase W6 — System health (issue #73) ------------------------------------
// All assumed. Readiness follows docforum-core#104 (`/health/ready`: database,
// migrations, required config, optional Stellar RPC); jobs follow #100's
// `JobRun` table and `GET /admin/jobs`; the outbox summary follows #94's
// dead-letter state. None of the three has landed. See
// ARCHITECTURE_ESSENTIALS.md "Known assumptions — Phase W6".

/** `degraded`: only optional checks are failing (e.g. Stellar RPC down takes
 * payments out, not the whole API — docforum-core#104). */
export type ReadinessStatus = 'ready' | 'degraded' | 'not_ready';

export type ReadinessCheckStatus = 'pass' | 'warn' | 'fail';

export interface ReadinessCheck {
  /** `database`, `migrations`, `config`, `stellar_rpc` today; others are shown by name. */
  name: string;
  status: ReadinessCheckStatus;
  /** Optional checks degrade readiness instead of failing it. */
  required: boolean;
  durationMs: number | null;
  /** Operator-facing detail, e.g. "2 migrations pending". Never secrets. */
  message: string | null;
}

export interface ReadinessReport {
  status: ReadinessStatus;
  /** When the checks actually ran — docforum-core caches the result for a few seconds. */
  checkedAt: string;
  checks: ReadinessCheck[];
}

export type JobRunStatus = 'running' | 'succeeded' | 'failed';

/** Mirrors docforum-core#100's `JobRun` row. */
export interface JobRun {
  id: string;
  job: string;
  status: JobRunStatus;
  startedAt: string;
  finishedAt: string | null;
  /** Failure message for `failed` runs; `null` otherwise. */
  error: string | null;
  itemsProcessed: number | null;
  /** `schedule` for ticks, `manual` for admin-triggered runs. */
  trigger: 'schedule' | 'manual';
}

export interface BackgroundJob {
  name: string;
  /** Human-readable schedule as registered, e.g. "every 5 minutes" or a cron expression. */
  schedule: string;
  lastRun: JobRun | null;
  lastSuccess: JobRun | null;
  lastFailure: JobRun | null;
  nextRunAt: string | null;
  /** True while any instance holds the job's advisory lock. */
  running: boolean;
}

export interface OutboxSummary {
  pendingCount: number;
  /** Events that exhausted their delivery attempts (docforum-core#94). */
  deadLetterCount: number;
  oldestPendingAt: string | null;
}
