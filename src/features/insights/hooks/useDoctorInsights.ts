import { useQuery } from '@tanstack/react-query';
import * as insightsService from '../../../services/insights-service';
import { useAuthStore } from '../../../store/auth-store';
import type { DateRangePreset, DoctorPracticeInsights } from '../../../types/models';

export interface UseDoctorInsightsParams {
  preset: DateRangePreset;
  startDate?: string;
  endDate?: string;
}

export function useDoctorInsights(params: UseDoctorInsightsParams) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery<DoctorPracticeInsights>({
    queryKey: ['doctor', 'insights', params],
    queryFn: () => insightsService.getDoctorPracticeInsights(accessToken!, params),
    enabled: Boolean(accessToken),
  });
}
