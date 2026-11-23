/* eslint-disable no-restricted-syntax -- Existing DEFAULT_MOCK_* fixture tracked by #299; it moves to src/mocks/ or goes when the real endpoint lands. */
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/auth-store';
import {
  getFacilityPayoutLedger,
  type FacilityLedgerFilters,
} from '../../../services/payments-service';
import { ApiError } from '../../../services/api-client';
import { paymentKeys } from '../../../query-keys';
import type { FacilityLedgerPage } from '../../../types/models';

export type UseFacilityLedgerFilters = FacilityLedgerFilters;

/**
 * The signed-in facility's ledger (issue #271). `facilityId` only scopes the
 * cache key: docforum-core derives the facility from the session, so a
 * facility can never request another facility's ledger.
 *
 * There is deliberately no mock fallback — fake rows would hide the very
 * failure this screen exists to show (and would cache invented totals).
 */
export function useFacilityLedger(facilityId: string, filters: UseFacilityLedgerFilters = {}) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery<FacilityLedgerPage, Error>({
    queryKey: paymentKeys.ledger(facilityId, filters),
    queryFn: async ({ signal }) => {
      if (!accessToken) throw new Error('Not authenticated');
      return getFacilityPayoutLedger(accessToken, filters, signal);
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
