import { useMemo } from 'react';
import { infiniteQueryOptions, useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import * as paymentHistoryService from '../../../services/payment-history-service';
import type { PaymentHistoryFilters } from '../../../services/payment-history-service';
import { useAuthStore } from '../../../store/auth-store';
import { paymentKeys } from '../../../query-keys';
import type { PaymentHistoryPage } from '../../../types/models';

/** Drop empty/"all" filters so an unfiltered view shares one cache entry. */
function cleanPaymentHistoryFilters(filters?: PaymentHistoryFilters): PaymentHistoryFilters | undefined {
  if (!filters) return undefined;
  const cleaned: PaymentHistoryFilters = {};
  if (filters.status && filters.status !== 'all') cleaned.status = filters.status;
  if (filters.from) cleaned.from = filters.from;
  if (filters.to) cleaned.to = filters.to;
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

/** Shared by `usePaymentHistory` and the /payments route loader (#112).
 * A read-only list — prefetching it moves no money. The loader prefetches the
 * unfiltered list, which is the page's initial view. */
export function paymentHistoryQueryOptions(accessToken: string | null, filters?: PaymentHistoryFilters) {
  const cleanFilters = cleanPaymentHistoryFilters(filters);
  return infiniteQueryOptions({
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

export function usePaymentHistory(filters?: PaymentHistoryFilters) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const options = useMemo(() => paymentHistoryQueryOptions(accessToken, filters), [accessToken, filters]);

  return useInfiniteQuery(options);
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
      const history = queryClient.getQueryData<{ pages: PaymentHistoryPage[] }>(
        paymentKeys.history(),
      );
      return history?.pages
        .flatMap((page) => page.intents)
        .find((entry) => entry.id === id);
    },
  });
}
