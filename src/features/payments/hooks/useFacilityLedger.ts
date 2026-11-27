import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/auth-store';
import {
  getFacilityPayoutLedger,
  type FacilityLedgerFilters,
} from '../../../services/payments-service';
import { ApiError } from '../../../services/api-client';
import { paymentKeys } from '../../../query-keys';
import { clearPayoutBlock, recordPayoutBlock } from '../../../store/payout-block-store';
import type { FacilityLedgerPage } from '../../../types/models';

export type UseFacilityLedgerFilters = FacilityLedgerFilters;

/**
 * The signed-in facility's ledger (issue #271). `facilityId` only scopes the
 * cache key: docforum-core derives the facility from the session, so a
 * facility can never request another facility's ledger.
 *
 * There is deliberately no mock fallback — fake rows would hide the very
 * failure this screen exists to show (and would cache invented totals).
 *
 * A real answer means payouts are working again, so any payout-block banner
 * raised by an earlier failure can go (#279). A payout-setup rejection is
 * recorded for that banner and still rethrown, so the ledger reports the
 * failure rather than papering over it.
 */
export function useFacilityLedger(facilityId: string, filters: UseFacilityLedgerFilters = {}) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery<FacilityLedgerPage, Error>({
    queryKey: paymentKeys.ledger(facilityId, filters),
    queryFn: async ({ signal }) => {
      if (!accessToken) throw new Error('Not authenticated');
      try {
        const page = await getFacilityPayoutLedger(accessToken, filters, signal);
        clearPayoutBlock();
        return page;
      } catch (error) {
        recordPayoutBlock(error);
        throw error;
      }
    },
    enabled: Boolean(facilityId && accessToken),
    // A 4xx (including INVALID_CURSOR after a filter change) won't fix
    // itself by retrying; the component resets to page one instead.
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
      return failureCount < 1;
    },
  });
}
