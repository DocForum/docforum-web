import { useQuery, useQueries } from '@tanstack/react-query';
import * as patientChartService from '../../../services/patient-chart-service';
import * as healthProfileService from '../../../services/health-profile-service';
import { useAuthStore } from '../../../store/auth-store';
import { useProfileStore } from '../../../store/profile-store';
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
        queryKey: ['patient', targetId, 'health', 'allergies'],
        queryFn: ({ signal }) =>
          healthProfileService.listHealthEntries(targetId!, 'allergies', accessToken!, signal),
        enabled: Boolean(accessToken && targetId),
      },
      {
        queryKey: ['patient', targetId, 'health', 'conditions'],
        queryFn: ({ signal }) =>
          healthProfileService.listHealthEntries(targetId!, 'conditions', accessToken!, signal),
        enabled: Boolean(accessToken && targetId),
      },
      {
        queryKey: ['patient', targetId, 'health', 'medications'],
        queryFn: ({ signal }) =>
          healthProfileService.listHealthEntries(targetId!, 'medications', accessToken!, signal),
        enabled: Boolean(accessToken && targetId),
      },
    ],
  });

  const careThreadQuery = useQuery<CareThread | null>({
    queryKey: ['patient', targetId, 'care-thread'],
    queryFn: ({ signal }) =>
      patientChartService.getCareThreadById(targetId!, accessToken!, signal),
    enabled: Boolean(accessToken && targetId),
  });

  const activeOrdersQuery = useQuery<Order[]>({
    queryKey: ['patient', targetId, 'active-orders'],
    queryFn: ({ signal }) =>
      patientChartService.listActiveOrders(targetId!, accessToken!, signal),
    enabled: Boolean(accessToken && targetId),
  });

  const recentResultsQuery = useQuery<LabResult[]>({
    queryKey: ['patient', targetId, 'recent-results'],
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
