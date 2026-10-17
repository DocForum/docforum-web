import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/auth-store';
import { getFacilities, type FacilitySearchParams } from '../../../services/facility-service';
import type { FacilityWithDistance } from '../../../types/models';

export function useFacilitySearch(params: FacilitySearchParams) {
  const accessToken = useAuthStore((s) => s.accessToken);

  return useQuery<FacilityWithDistance[]>({
    queryKey: ['facilities', params.type, params.lat, params.lng, params.query],
    queryFn: () => getFacilities(params, accessToken),
  });
}
