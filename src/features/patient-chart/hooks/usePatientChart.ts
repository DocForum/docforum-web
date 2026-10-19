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
        queryFn: () =>
          healthProfileService.listHealthEntries(targetId!, 'allergies', accessToken!),
        enabled: Boolean(accessToken && targetId),
      },
      {
        queryKey: ['patient', targetId, 'health', 'conditions'],
        queryFn: () =>
          healthProfileService.listHealthEntries(targetId!, 'conditions', accessToken!),
        enabled: Boolean(accessToken && targetId),
      },
      {
        queryKey: ['patient', targetId, 'health', 'medications'],
        queryFn: () =>
          healthProfileService.listHealthEntries(targetId!, 'medications', accessToken!),
        enabled: Boolean(accessToken && targetId),
      },
    ],
  });

  const careThreadQuery = useQuery<CareThread | null>({
    queryKey: ['patient', targetId, 'care-thread'],
    queryFn: () =>
      patientChartService.getCareThreadById(targetId!, accessToken!),
    enabled: Boolean(accessToken && targetId),
  });

  const activeOrdersQuery = useQuery<Order[]>({
    queryKey: ['patient', targetId, 'active-orders'],
    queryFn: () =>
      patientChartService.listActiveOrders(targetId!, accessToken!),
    enabled: Boolean(accessToken && targetId),
  });

  const recentResultsQuery = useQuery<LabResult[]>({
    queryKey: ['patient', targetId, 'recent-results'],
    queryFn: () =>
      patientChartService.listRecentResults(targetId!, accessToken!),
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
