import { useQuery } from '@tanstack/react-query';
import * as insightsService from '../../../services/insights-service';
import { useAuthStore } from '../../../store/auth-store';
import type { DateRangePreset, FacilityPerformanceInsights } from '../../../types/models';

export interface UseFacilityInsightsParams {
  facilityId: string;
  preset: DateRangePreset;
  startDate?: string;
  endDate?: string;
}

export function useFacilityInsights({
  facilityId,
  preset,
  startDate,
  endDate,
}: UseFacilityInsightsParams) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery<FacilityPerformanceInsights>({
    queryKey: ['facility', facilityId, 'insights', { preset, startDate, endDate }],
    queryFn: () =>
      insightsService.getFacilityPerformanceInsights(accessToken!, facilityId, {
        preset,
        startDate,
        endDate,
      }),
    enabled: Boolean(accessToken && facilityId),
  });
}
