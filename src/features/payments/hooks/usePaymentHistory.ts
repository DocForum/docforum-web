import { infiniteQueryOptions, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import * as paymentHistoryService from '../../../services/payment-history-service';
import { useAuthStore } from '../../../store/auth-store';
import { paymentKeys } from '../../../query-keys';

/** Shared by `usePaymentHistory` and the /payments route loader (#112).
 * A read-only list — prefetching it moves no money. */
export function paymentHistoryQueryOptions(accessToken: string | null) {
  return infiniteQueryOptions({
    queryKey: paymentKeys.history(),
    queryFn: ({ pageParam, signal }) => paymentHistoryService.listPaymentHistory(pageParam, accessToken!, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(accessToken),
  });
}

export function usePaymentHistory() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useInfiniteQuery(paymentHistoryQueryOptions(accessToken));
}

export function usePaymentHistoryEntry(id: string | undefined) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: paymentKeys.historyEntry(id ?? ''),
    queryFn: ({ signal }) => paymentHistoryService.getPaymentHistoryEntry(id!, accessToken!, signal),
    enabled: Boolean(accessToken && id),
  });
}
