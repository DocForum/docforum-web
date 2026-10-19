import { ApiError } from '../../services/api-client';
import { UNREACHABLE, formatDuration, readinessDisplay, runDuration } from './status';
import type { StatusDisplay, Tone } from './status';
import type { JobRun, ReadinessReport } from '../../types/models';

export type HealthSource = 'readiness' | 'jobs' | 'outbox';

const SOURCES: Record<HealthSource, { noun: string; issue: string }> = {
  readiness: { noun: 'readiness checks', issue: 'docforum-core#104' },
  jobs: { noun: 'background job history', issue: 'docforum-core#100' },
  outbox: { noun: 'outbox stats', issue: 'docforum-core#94' },
};

const AUTH_MESSAGE = 'Your session no longer has admin access. Sign in again with an admin account.';

export function isNotServed(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

export function isAuthError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

export function describeLoadError(error: unknown, source: HealthSource): string {
  const { noun, issue } = SOURCES[source];
  if (isAuthError(error)) return AUTH_MESSAGE;
  if (isNotServed(error)) return `docforum-core doesn't serve ${noun} yet (${issue}).`;
  return `Couldn't load ${noun}. The preview backend may be waking up — this page tries again every 30 seconds.`;
}

/**
 * One verdict for the readiness tile and panel. A network failure or a
 * non-report 5xx (Render's own error page while the instance boots) is
 * "unreachable" — that's the answer to "is it down?", not a page error.
 *
 * The error wins over `report`: React Query keeps the last good data when a
 * poll fails, and a stale "Ready" is exactly the wrong thing to show.
 */
export function readinessVerdict(report: ReadinessReport | undefined, error: unknown): StatusDisplay {
  if (isNotServed(error)) {
    return { label: 'Not served', tone: 'neutral', description: describeLoadError(error, 'readiness') };
  }
  if (isAuthError(error)) return { label: 'No access', tone: 'danger', description: AUTH_MESSAGE };
  if (error) return UNREACHABLE;
  if (report) return readinessDisplay(report.status);
  return { label: 'Checking…', tone: 'neutral', description: 'Asking docforum-core whether it is ready.' };
}

export interface RunOutcome {
  tone: Tone;
  title: string;
  detail: string;
}

function itemsPhrase(count: number | null): string {
  if (count === null) return '';
  return count === 1 ? '1 item' : `${count.toLocaleString('en-GB')} items`;
}

/** What docforum-core said about the run it started. */
export function describeRun(run: JobRun): RunOutcome {
  const duration = runDuration(run);

  if (run.status === 'succeeded') {
    const took = duration === null ? '' : ` in ${formatDuration(duration)}`;
    const items = itemsPhrase(run.itemsProcessed);
    return {
      tone: 'ok',
      title: 'Run finished',
      detail: items ? `Processed ${items}${took}.` : `Finished${took}.`,
    };
  }
  if (run.status === 'failed') {
    const message = run.error?.trim() || 'docforum-core recorded no error message.';
    return {
      tone: 'danger',
      title: 'Run failed',
      detail: duration === null ? message : `${message} (after ${formatDuration(duration)})`,
    };
  }
  return {
    tone: 'info',
    title: 'Run started',
    detail: "It's still going after the request returned. Its result will appear under Last run when it finishes.",
  };
}

/** Why the run request itself didn't produce a run. */
export function describeRunError(error: unknown, jobName: string): RunOutcome {
  if (error instanceof ApiError) {
    if (error.status === 409) {
      return {
        tone: 'warning',
        title: 'Already running',
        detail: `Another instance is running ${jobName} right now, so docforum-core didn't start a second run.`,
      };
    }
    if (error.status === 404) {
      return {
        tone: 'warning',
        title: 'Job not found',
        detail: `docforum-core doesn't run ${jobName} on demand — the job may have been removed, or manual runs aren't served yet (docforum-core#100).`,
      };
    }
    if (isAuthError(error)) return { tone: 'danger', title: 'Not allowed', detail: AUTH_MESSAGE };
    return {
      tone: 'danger',
      title: 'Run not started',
      detail: `docforum-core refused the run (${error.status}): ${error.message}`,
    };
  }
  return {
    tone: 'warning',
    title: "Couldn't confirm",
    detail:
      "docforum-core didn't answer, so the run may or may not have started. Check Last run before trying again — " +
      'jobs are idempotent, so a second run is safe, just wasted work.',
  };
}
