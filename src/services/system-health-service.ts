import { ApiError, apiFetch } from './api-client';
import type { BackgroundJob, JobRun, OutboxSummary, ReadinessReport } from '../types/models';

// docforum-core answers "not ready" with a 503 whose body is still the full
// report — that's what Render's probe keys off. Only unwrap it when it
// actually looks like one; a proxy's 503 page is a real failure.
function isReadinessReport(body: unknown): body is ReadinessReport {
  if (typeof body !== 'object' || body === null) return false;
  const candidate = body as Partial<ReadinessReport>;
  return typeof candidate.status === 'string' && Array.isArray(candidate.checks);
}

/** Assumed contract (docforum-core#104): `200` when ready or degraded, `503`
 * when not ready, same body either way. */
export async function getReadiness(accessToken: string, signal?: AbortSignal): Promise<ReadinessReport> {
  try {
    return await apiFetch<ReadinessReport>('/health/ready', { accessToken, signal });
  } catch (error) {
    if (error instanceof ApiError && error.status === 503 && isReadinessReport(error.body)) return error.body;
    throw error;
  }
}

/** Assumed contract (docforum-core#100): every registered job, with its most
 * recent run, success and failure. */
export function listJobs(accessToken: string, signal?: AbortSignal): Promise<BackgroundJob[]> {
  return apiFetch<BackgroundJob[]>('/admin/jobs', { accessToken, signal });
}

/**
 * Triggers one run outside the schedule. docforum-core takes the job's
 * advisory lock first, so a run already in progress on any instance comes
 * back as `409` rather than running twice. The returned run may still be
 * `running` if the job outlives the request.
 */
export function runJob(jobName: string, accessToken: string): Promise<JobRun> {
  return apiFetch<JobRun>(`/admin/jobs/${encodeURIComponent(jobName)}/run`, { method: 'POST', accessToken });
}

/** Assumed contract (docforum-core#94). A `404` means the outbox isn't exposed. */
export function getOutboxSummary(accessToken: string, signal?: AbortSignal): Promise<OutboxSummary> {
  return apiFetch<OutboxSummary>('/admin/outbox', { accessToken, signal });
}
