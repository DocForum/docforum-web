import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/auth-store';
import {
  getEligibleFacilities,
  getFacilities,
  getFacilityPriceHistory,
  type FacilitySearchParams,
} from '../../../services/facility-service';
import { facilitySearchKeys } from '../../../query-keys';
import type { EligibleFacility, FacilityPrice, FacilityWithDistance } from '../../../types/models';

export function useFacilitySearch(params: FacilitySearchParams, enabled = true) {
  const accessToken = useAuthStore((s) => s.accessToken);

  return useQuery<FacilityWithDistance[]>({
    queryKey: facilitySearchKeys.list(params),
    queryFn: ({ signal }) => getFacilities(params, accessToken, signal),
    enabled,
  });
}

/** Facilities eligible for one catalog item, each with its price in force
 * (issue #258). Disabled until a catalog code is known — a finder opened
 * without an order shows plain distance results instead. */
export function useEligibleFacilities(
  catalogItemCode: string | undefined,
  params: FacilitySearchParams,
) {
  const accessToken = useAuthStore((s) => s.accessToken);

  return useQuery<EligibleFacility[]>({
    queryKey: facilitySearchKeys.eligible(catalogItemCode ?? '', params),
    queryFn: ({ signal }) =>
      getEligibleFacilities(catalogItemCode!, params, accessToken, signal),
    enabled: Boolean(catalogItemCode),
  });
}

/** One facility's public price history, loaded per card (issue #258). */
export function useFacilityPriceHistory(facilityId: string | undefined) {
  const accessToken = useAuthStore((s) => s.accessToken);

  return useQuery<FacilityPrice[]>({
    queryKey: facilitySearchKeys.priceHistory(facilityId ?? ''),
    queryFn: ({ signal }) => getFacilityPriceHistory(facilityId!, accessToken, signal),
    enabled: Boolean(facilityId),
    staleTime: 5 * 60 * 1000,
  });
}
