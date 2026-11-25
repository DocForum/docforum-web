import { useQuery } from '@tanstack/react-query';
import { adminMetricsKeys } from '../../../query-keys';
import { useAuthStore } from '../../../store/auth-store';
import * as adminMetricsService from '../../../services/admin-metrics-service';

export function useAdminMetrics(from: string, to: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  return useQuery({
    queryKey: adminMetricsKeys.range(from, to),
    queryFn: ({ signal }) => adminMetricsService.getAdminSuccessMetrics(from, to, accessToken!, signal),
    enabled: Boolean(accessToken && from && to),
  });
}
