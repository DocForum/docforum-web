import { useInfiniteQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/auth-store';
import { getFacilityPayoutLedger } from '../../../services/payments-service';
import type { FacilityLedgerPage } from '../../../types/models';

export interface UseFacilityLedgerFilters {
  status?: string;
  asset?: string;
}

/**
 * Cursor-paginated payout ledger. A failure while loading the next page
 * leaves the pages already on screen untouched — React Query keeps the
 * previous data and exposes `isFetchNextPageError` separately from the
 * first-load error.
 */
export function useFacilityLedger(facilityId: string, filters: UseFacilityLedgerFilters = {}) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useInfiniteQuery<FacilityLedgerPage, Error>({
    queryKey: ['facility-payout-ledger', facilityId, filters],
    queryFn: ({ pageParam, signal }) => {
      if (!accessToken) throw new Error('Not authenticated');
      return getFacilityPayoutLedger(
        facilityId,
        accessToken,
        { ...filters, cursor: pageParam as string | undefined },
        signal,
      );
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(facilityId && accessToken),
  });
}
