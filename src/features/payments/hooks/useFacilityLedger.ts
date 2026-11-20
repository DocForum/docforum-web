import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/auth-store';
import { getFacilityPayoutLedger } from '../../../services/payments-service';
import { ApiTimeoutError, isAbortError } from '../../../services/api-client';
import { paymentKeys } from '../../../query-keys';
import { clearPayoutBlock, recordPayoutBlock } from '../../../store/payout-block-store';
import type { FacilityLedgerPage } from '../../../types/models';

import { DEFAULT_MOCK_LEDGER_PAGE } from '../demo-ledger';
export { DEFAULT_MOCK_LEDGER_PAGE } from '../demo-ledger';

export interface UseFacilityLedgerFilters {
  cursor?: string;
  status?: string;
  asset?: string;
}

export function useFacilityLedger(facilityId: string, filters: UseFacilityLedgerFilters = {}) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery<FacilityLedgerPage, Error>({
    queryKey: paymentKeys.ledger(facilityId, filters),
    queryFn: async ({ signal }) => {
      if (!accessToken) throw new Error('Not authenticated');
      try {
        const page = await getFacilityPayoutLedger(facilityId, accessToken, filters, signal);
        // A real answer from docforum-core means payouts are working again,
        // so a banner raised by an earlier failure can go away (#279).
        clearPayoutBlock();
        return page;
      } catch (error) {
        // A cancelled query must stay cancelled — resolving it with mock data
        // would store fake totals in the cache after the user navigated away.
        if (isAbortError(error) || error instanceof ApiTimeoutError) throw error;

        // Payout-setup failures must surface instead of being papered over
        // with the demo ledger below: masking them would hide exactly the
        // state the facility banner exists to report (#279).
        if (recordPayoutBlock(error)) throw error;

        // Fallback for dev / unmocked environment
        let filteredEntries = DEFAULT_MOCK_LEDGER_PAGE.entries;
        if (filters.status && filters.status !== 'all') {
          filteredEntries = filteredEntries.filter((e) => e.status === filters.status);
        }
        if (filters.asset && filters.asset !== 'all') {
          filteredEntries = filteredEntries.filter((e) => e.asset === filters.asset);
        }

        return {
          ...DEFAULT_MOCK_LEDGER_PAGE,
          entries: filteredEntries,
        };
      }
    },
    enabled: Boolean(facilityId && accessToken),
  });
}
