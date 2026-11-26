import { useQuery } from '@tanstack/react-query';
import * as overviewService from '../../../services/admin-overview-service';
import { ApiError } from '../../../services/api-client';
import { useAuthStore } from '../../../store/auth-store';
import { overviewKeys } from '../../../query-keys';
import type { OperationsOverview } from '../../../types/models';

/** One minute, matching the issue. React Query only polls while the document
 * is visible and refetches on focus, so a hidden tab stops polling and catches
 * up the moment it is shown again. */
export const OVERVIEW_REFRESH_MS = 60_000;

function shouldRetry(failureCount: number, error: Error): boolean {
  if (error instanceof ApiError && error.status < 500) return false;
  return failureCount < 1;
}

export function useOperationsOverview() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery<OperationsOverview>({
    queryKey: overviewKeys.all,
    queryFn: ({ signal }) => overviewService.getOperationsOverview(accessToken!, signal),
    enabled: Boolean(accessToken),
    retry: shouldRetry,
    refetchInterval: OVERVIEW_REFRESH_MS,
    refetchIntervalInBackground: false,
  });
}
