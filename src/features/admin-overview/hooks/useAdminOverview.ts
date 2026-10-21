import { useQuery } from '@tanstack/react-query';
import * as adminOverviewService from '../../../services/admin-overview-service';
import { ApiError } from '../../../services/api-client';
import { useAuthStore } from '../../../store/auth-store';
import { overviewKeys } from '../../../query-keys';
import { REFRESH_INTERVAL_MS } from '../sections';

// React Query only fires `refetchInterval` while the document is visible
// (`refetchIntervalInBackground: false` is the default, spelled out here
// because issue #68 makes "polling stops when the tab is hidden" a
// requirement): a backgrounded tab stops polling and refetches on focus the
// moment the admin comes back.
const POLLING = {
  refetchInterval: REFRESH_INTERVAL_MS,
  refetchIntervalInBackground: false,
} as const;

// A 4xx won't fix itself on retry, and the next poll is never far off.
function shouldRetry(failureCount: number, error: Error): boolean {
  if (error instanceof ApiError && error.status < 500) return false;
  return failureCount < 1;
}

/** The whole board in one aggregated read — counts, oldest ages and
 * per-section availability (assumed contract, docforum-core#123). */
export function useAdminOverview() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: overviewKeys.board(),
    queryFn: ({ signal }) => adminOverviewService.getAdminOverview(accessToken!, signal),
    enabled: Boolean(accessToken),
    retry: shouldRetry,
    ...POLLING,
  });
}
