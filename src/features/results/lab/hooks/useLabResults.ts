import { useQuery } from '@tanstack/react-query';
import * as labResultsService from '../../../../services/lab-results-service';
import { useAuthStore } from '../../../../store/auth-store';
import { labResultKeys } from '../../../../query-keys';
import { ApiError } from '../../../../services/api-client';

// A 4xx won't fix itself on retry.
function shouldRetry(failureCount: number, error: Error): boolean {
  if (error instanceof ApiError && error.status < 500) return false;
  return failureCount < 1;
}

export function useMyLabResults() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: labResultKeys.list(),
    queryFn: ({ signal }) => labResultsService.listMyLabResults(accessToken!, signal),
    enabled: Boolean(accessToken),
    retry: shouldRetry,
  });
}

export function useLabResult(resultId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: labResultKeys.detail(resultId),
    queryFn: ({ signal }) => labResultsService.getLabResult(resultId, accessToken!, signal),
    enabled: Boolean(accessToken && resultId),
    retry: shouldRetry,
  });
}
