import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as systemService from '../../../services/system-health-service';
import { ApiError } from '../../../services/api-client';
import { useAuthStore } from '../../../store/auth-store';
import { REFRESH_INTERVAL_MS } from '../status';
import type { ReadinessReport } from '../../../types/models';

const SYSTEM_KEY = ['admin', 'system'] as const;

// React Query only fires `refetchInterval` while the document is visible
// (`refetchIntervalInBackground` defaults to false) and refetches on focus,
// so a backgrounded tab stops polling and catches up the moment it's back.
const POLLING = {
  refetchInterval: REFRESH_INTERVAL_MS,
  refetchIntervalInBackground: false,
} as const;

// A 4xx won't fix itself on retry, and the next poll is never far off.
function shouldRetry(failureCount: number, error: Error): boolean {
  if (error instanceof ApiError && error.status < 500) return false;
  return failureCount < 1;
}

export interface TimedReadiness {
  report: ReadinessReport;
  /** Round trip of the request — a long one on the preview is a cold start. */
  respondedInMs: number;
}

export function useReadiness() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: [...SYSTEM_KEY, 'readiness'],
    queryFn: async ({ signal }): Promise<TimedReadiness> => {
      const started = performance.now();
      const report = await systemService.getReadiness(accessToken!, signal);
      return { report, respondedInMs: performance.now() - started };
    },
    enabled: Boolean(accessToken),
    retry: shouldRetry,
    ...POLLING,
  });
}

export function useJobs() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: [...SYSTEM_KEY, 'jobs'],
    queryFn: ({ signal }) => systemService.listJobs(accessToken!, signal),
    enabled: Boolean(accessToken),
    retry: shouldRetry,
    ...POLLING,
  });
}

export function useOutboxSummary() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: [...SYSTEM_KEY, 'outbox'],
    queryFn: ({ signal }) => systemService.getOutboxSummary(accessToken!, signal),
    enabled: Boolean(accessToken),
    retry: shouldRetry,
    ...POLLING,
  });
}

export function useRunJob() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (jobName: string) => systemService.runJob(jobName, accessToken!),
    // Every outcome is worth a fresh look: a run, a 409 (someone else's run
    // is in progress), even a timeout — the list shows whether it started.
    // The outbox dispatcher is a job too, so its counts may have moved.
    onSettled: () => queryClient.invalidateQueries({ queryKey: SYSTEM_KEY }),
  });
}
