import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/auth-store';
import { getFacilities, type FacilitySearchParams } from '../../../services/facility-service';
import { facilitySearchKeys } from '../../../query-keys';
import type { FacilityWithDistance } from '../../../types/models';

export function useFacilitySearch(params: FacilitySearchParams) {
  const accessToken = useAuthStore((s) => s.accessToken);

  return useQuery<FacilityWithDistance[]>({
    queryKey: facilitySearchKeys.list(params),
    queryFn: ({ signal }) => getFacilities(params, accessToken, signal),
  });
}
