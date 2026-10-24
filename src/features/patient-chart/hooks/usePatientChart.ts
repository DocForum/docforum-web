import { useQuery, useQueries } from '@tanstack/react-query';
import * as patientChartService from '../../../services/patient-chart-service';
import * as healthProfileService from '../../../services/health-profile-service';
import { useAuthStore } from '../../../store/auth-store';
import { useProfileStore } from '../../../store/profile-store';
import { patientChartKeys } from '../../../query-keys';
import type {
  CareThread,
  Order,
  LabResult,
} from '../../../types/models';

export function usePatientChart(patientProfileId?: string) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const selectedProfileId = useProfileStore((s) => s.selectedProfileId);

  // If no patientProfileId provided, use selected profile
  const targetId = patientProfileId || selectedProfileId;

  const healthQueries = useQueries({
    queries: [
      {
        queryKey: patientChartKeys.health(targetId!, 'allergies'),
        queryFn: ({ signal }) =>
          healthProfileService.listHealthEntries(targetId!, 'allergies', accessToken!, signal),
        enabled: Boolean(accessToken && targetId),
      },
      {
        queryKey: patientChartKeys.health(targetId!, 'conditions'),
        queryFn: ({ signal }) =>
          healthProfileService.listHealthEntries(targetId!, 'conditions', accessToken!, signal),
        enabled: Boolean(accessToken && targetId),
      },
      {
        queryKey: patientChartKeys.health(targetId!, 'medications'),
        queryFn: ({ signal }) =>
          healthProfileService.listHealthEntries(targetId!, 'medications', accessToken!, signal),
        enabled: Boolean(accessToken && targetId),
      },
    ],
  });

  const careThreadQuery = useQuery<CareThread | null>({
    queryKey: patientChartKeys.careThread(targetId!),
    queryFn: ({ signal }) =>
      patientChartService.getCareThreadById(targetId!, accessToken!, signal),
    enabled: Boolean(accessToken && targetId),
  });

  const activeOrdersQuery = useQuery<Order[]>({
    queryKey: patientChartKeys.activeOrders(targetId!),
    queryFn: ({ signal }) =>
      patientChartService.listActiveOrders(targetId!, accessToken!, signal),
    enabled: Boolean(accessToken && targetId),
  });

  const recentResultsQuery = useQuery<LabResult[]>({
    queryKey: patientChartKeys.recentResults(targetId!),
    queryFn: ({ signal }) =>
      patientChartService.listRecentResults(targetId!, accessToken!, signal),
    enabled: Boolean(accessToken && targetId),
  });

  return {
    allergies: healthQueries[0].data ?? [],
    conditions: healthQueries[1].data ?? [],
    medications: healthQueries[2].data ?? [],
    careThread: careThreadQuery.data ?? null,
    activeOrders: activeOrdersQuery.data ?? [],
    recentResults: recentResultsQuery.data ?? [],
    isLoading:
      healthQueries.some((q) => q.isLoading) ||
      careThreadQuery.isLoading ||
      activeOrdersQuery.isLoading ||
      recentResultsQuery.isLoading,
    error:
      healthQueries.find((q) => q.isError) ||
      careThreadQuery.error ||
      activeOrdersQuery.error ||
      recentResultsQuery.error,
  };
}
