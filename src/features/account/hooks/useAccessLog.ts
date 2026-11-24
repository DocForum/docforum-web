import { useInfiniteQuery } from '@tanstack/react-query';
import * as accessLogService from '../../../services/access-log-service';
import type { AccessLogFilters } from '../../../services/access-log-service';
import { useAuthStore } from '../../../store/auth-store';
import { accountKeys } from '../../../query-keys';

export function useAccessLog(filters: AccessLogFilters) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useInfiniteQuery({
    queryKey: accountKeys.accessLog(filters),
    queryFn: ({ pageParam, signal }) =>
      accessLogService.listAccessLog({ ...filters, cursor: pageParam }, accessToken!, signal),
    initialPageParam: undefined as string | undefined,
    // null from the API is the end of the log; `undefined` is what React Query
    // reads as "there is no next page".
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(accessToken),
  });
}
