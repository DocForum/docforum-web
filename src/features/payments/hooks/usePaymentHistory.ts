import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import * as paymentHistoryService from '../../../services/payment-history-service';
import { useAuthStore } from '../../../store/auth-store';

export function usePaymentHistory() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useInfiniteQuery({
    queryKey: ['payments', 'mine'],
    queryFn: ({ pageParam, signal }) => paymentHistoryService.listPaymentHistory(pageParam, accessToken!, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(accessToken),
  });
}

export function usePaymentHistoryEntry(id: string | undefined) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ['payments', 'mine', id ?? ''],
    queryFn: ({ signal }) => paymentHistoryService.getPaymentHistoryEntry(id!, accessToken!, signal),
    enabled: Boolean(accessToken && id),
  });
}
