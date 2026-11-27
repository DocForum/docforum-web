import { ApiError } from '../../services/api-client';
import { englishTranslator } from '../../i18n/englishTranslator';
import type { Translator } from '../../i18n/useT';
import { formatDuration, readinessDisplay, runDuration, unreachableDisplay } from './status';
import type { StatusDisplay, Tone } from './status';
import type { JobRun, ReadinessReport } from '../../types/models';

export type HealthSource = 'readiness' | 'jobs' | 'outbox';

const SOURCES: Record<HealthSource, { noun: string; id: 'readiness' | 'jobs' | 'outbox'; issue?: string }> = {
  readiness: { noun: 'readiness checks', id: 'readiness', issue: 'docforum-core#104' },
  jobs: { noun: 'background job history', id: 'jobs', issue: 'docforum-core#100' },
  outbox: { noun: 'outbox dead letters', id: 'outbox' },
};

function authMessage(t: Translator): string {
  return t(
    'adminSystem.errors.auth',
    'Your session no longer has admin access. Sign in again with an admin account.',
  );
}

export function isNotServed(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

export function isAuthError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

export function describeLoadError(
  error: unknown,
  source: HealthSource,
  t: Translator = englishTranslator,
): string {
  const { id, issue } = SOURCES[source];
  // The noun is interpolated into the sentence, so it is translated too.
  const noun = t(`adminSystem.errors.noun.${id}`, SOURCES[source].noun);
  if (isAuthError(error)) return authMessage(t);
  if (isNotServed(error)) {
    return issue
      ? t(`adminSystem.errors.notServed.${id}`, "docforum-core doesn't serve {noun} yet ({issue}).", {
          noun,
          issue,
        })
      : t(`adminSystem.errors.notServed.${id}`, "This docforum-core version doesn't serve {noun}.", { noun });
  }
  return t(
    `adminSystem.errors.load.${id}`,
    "Couldn't load {noun}. The preview backend may be waking up — this page tries again every 30 seconds.",
    { noun },
  );
}

/**
 * One verdict for the readiness tile and panel. A network failure or a
 * non-report 5xx (Render's own error page while the instance boots) is
 * "unreachable" — that's the answer to "is it down?", not a page error.
 *
 * The error wins over `report`: React Query keeps the last good data when a
 * poll fails, and a stale "Ready" is exactly the wrong thing to show.
 */
export function readinessVerdict(
  report: ReadinessReport | undefined,
  error: unknown,
  t: Translator = englishTranslator,
): StatusDisplay {
  if (isNotServed(error)) {
    return {
      label: t('adminSystem.readiness.notServed.label', 'Not served'),
      tone: 'neutral',
      description: describeLoadError(error, 'readiness', t),
    };
  }
  if (isAuthError(error)) {
    return {
      label: t('adminSystem.readiness.noAccess.label', 'No access'),
      tone: 'danger',
      description: authMessage(t),
    };
  }
  if (error) return unreachableDisplay(t);
  if (report) return readinessDisplay(report.status, t);
  return {
    label: t('adminSystem.readiness.checking.label', 'Checking…'),
    tone: 'neutral',
    description: t('adminSystem.readiness.checking.description', 'Asking docforum-core whether it is ready.'),
  };
}

export interface RunOutcome {
  tone: Tone;
  title: string;
  detail: string;
}

function itemsPhrase(count: number | null, t: Translator): string {
  if (count === null) return '';
  return t('adminSystem.run.items', '{count, plural, one {# item} other {# items}}', { count });
}

/** What docforum-core said about the run it started. */
export function describeRun(run: JobRun, t: Translator = englishTranslator): RunOutcome {
  const duration = runDuration(run);

  if (run.status === 'succeeded') {
    const took = duration === null ? '' : t('adminSystem.run.took', ' in {duration}', {
      duration: formatDuration(duration, t),
    });
    const items = itemsPhrase(run.itemsProcessed, t);
    return {
      tone: 'ok',
      title: t('adminSystem.run.finished.title', 'Run finished'),
      detail: items
        ? t('adminSystem.run.finished.withItems', 'Processed {items}{took}.', { items, took })
        : t('adminSystem.run.finished.withoutItems', 'Finished{took}.', { took }),
    };
  }
  if (run.status === 'failed') {
    const message = run.error?.trim() || t('adminSystem.run.failed.noMessage', 'docforum-core recorded no error message.');
    return {
      tone: 'danger',
      title: t('adminSystem.run.failed.title', 'Run failed'),
      detail:
        duration === null
          ? message
          : t('adminSystem.run.failed.after', '{message} (after {duration})', {
              message,
              duration: formatDuration(duration, t),
            }),
    };
  }
  return {
    tone: 'info',
    title: t('adminSystem.run.started.title', 'Run started'),
    detail: t(
      'adminSystem.run.started.detail',
      "It's still going after the request returned. Its result will appear under Last run when it finishes.",
    ),
  };
}

/** Why the run request itself didn't produce a run. */
export function describeRunError(
  error: unknown,
  jobName: string,
  t: Translator = englishTranslator,
): RunOutcome {
  if (error instanceof ApiError) {
    if (error.status === 409) {
      return {
        tone: 'warning',
        title: t('adminSystem.run.alreadyRunning.title', 'Already running'),
        detail: t(
          'adminSystem.run.alreadyRunning.detail',
          "Another instance is running {jobName} right now, so docforum-core didn't start a second run.",
          { jobName },
        ),
      };
    }
    if (error.status === 404) {
      return {
        tone: 'warning',
        title: t('adminSystem.run.notFound.title', 'Job not found'),
        detail: t(
          'adminSystem.run.notFound.detail',
          "docforum-core doesn't run {jobName} on demand — the job may have been removed, or manual runs aren't served yet (docforum-core#100).",
          { jobName },
        ),
      };
    }
    if (isAuthError(error)) {
      return {
        tone: 'danger',
        title: t('adminSystem.run.notAllowed.title', 'Not allowed'),
        detail: authMessage(t),
      };
    }
    return {
      tone: 'danger',
      title: t('adminSystem.run.notStarted.title', 'Run not started'),
      detail: t(
        'adminSystem.run.notStarted.detail',
        'docforum-core refused the run ({status}): {message}',
        { status: error.status, message: error.message },
      ),
    };
  }
  return {
    tone: 'warning',
    title: t('adminSystem.run.unconfirmed.title', "Couldn't confirm"),
    detail: t(
      'adminSystem.run.unconfirmed.detail',
      "docforum-core didn't answer, so the run may or may not have started. Check Last run before trying again — " +
        'jobs are idempotent, so a second run is safe, just wasted work.',
    ),
  };
}
