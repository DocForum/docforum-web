import { useMemo } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import * as paymentHistoryService from '../../../services/payment-history-service';
import type { PaymentHistoryFilters } from '../../../services/payment-history-service';
import { useAuthStore } from '../../../store/auth-store';
import { paymentKeys } from '../../../query-keys';
import type { PaymentHistoryEntry } from '../../../types/models';

export function usePaymentHistory(filters?: PaymentHistoryFilters) {
  const accessToken = useAuthStore((state) => state.accessToken);

  const cleanFilters = useMemo(() => {
    if (!filters) return undefined;
    const cleaned: PaymentHistoryFilters = {};
    if (filters.status && filters.status !== 'all') cleaned.status = filters.status;
    if (filters.from) cleaned.from = filters.from;
    if (filters.to) cleaned.to = filters.to;
    return Object.keys(cleaned).length > 0 ? cleaned : undefined;
  }, [filters]);

  return useInfiniteQuery({
    queryKey: paymentKeys.history(cleanFilters),
    queryFn: ({ pageParam, signal }) =>
      paymentHistoryService.listPaymentHistory(
        cleanFilters ? { ...cleanFilters, cursor: pageParam } : pageParam,
        accessToken!,
        signal,
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(accessToken),
  });
}

export function usePaymentHistoryEntry(id: string | undefined) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: paymentKeys.historyEntry(id ?? ''),
    queryFn: ({ signal }) => paymentHistoryService.getPaymentHistoryEntry(id!, accessToken!, signal),
    enabled: Boolean(accessToken && id),
    initialData: () => {
      if (!id) return undefined;
      const history = queryClient.getQueryData<{
        pages: Array<{ intents: PaymentHistoryEntry[] }>;
      }>(paymentKeys.history());
      return history?.pages
        .flatMap((page) => page.intents)
        .find((entry) => entry.id === id);
    },
  });
}
