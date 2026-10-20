import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import * as paymentHistoryService from '../../../services/payment-history-service';
import { useAuthStore } from '../../../store/auth-store';
import { paymentKeys } from '../../../query-keys';

export function usePaymentHistory() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useInfiniteQuery({
    queryKey: paymentKeys.history(),
    queryFn: ({ pageParam }) => paymentHistoryService.listPaymentHistory(pageParam, accessToken!),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(accessToken),
  });
}

export function usePaymentHistoryEntry(id: string | undefined) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: paymentKeys.historyEntry(id ?? ''),
    queryFn: () => paymentHistoryService.getPaymentHistoryEntry(id!, accessToken!),
    enabled: Boolean(accessToken && id),
  });
}
