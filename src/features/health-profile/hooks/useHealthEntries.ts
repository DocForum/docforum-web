import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as healthService from '../../../services/health-profile-service';
import { useAuthStore } from '../../../store/auth-store';
import { useProfileStore } from '../../../store/profile-store';
import { invalidateFor } from '../../../invalidations';
import { healthKeys } from '../../../query-keys';
import type { HealthEntryInput, HealthSectionKey } from '../../../types/models';

export function useHealthEntries(section: HealthSectionKey) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const profileId = useProfileStore((state) => state.selectedProfileId);

  return useQuery({
    queryKey: healthKeys.section(profileId!, section),
    queryFn: ({ signal }) => healthService.listHealthEntries(profileId!, section, accessToken!, signal),
    enabled: Boolean(accessToken && profileId),
  });
}

export function useAddHealthEntry() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const profileId = useProfileStore((state) => state.selectedProfileId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: HealthEntryInput) => healthService.addHealthEntry(profileId!, input, accessToken!),
    onSuccess: (_data, variables) => {
      void invalidateFor(queryClient, 'health-profile.write', profileId!, variables.section);
    },
  });
}

export function useUpdateHealthEntry() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const profileId = useProfileStore((state) => state.selectedProfileId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ entryId, input }: { entryId: string; input: Omit<HealthEntryInput, 'section'>; section: HealthSectionKey }) =>
      healthService.updateHealthEntry(profileId!, entryId, input, accessToken!),
    onSuccess: (_data, variables) =>
      invalidateFor(queryClient, 'health-profile.write', profileId!, variables.section),
  });
}

export function useRemoveHealthEntry() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const profileId = useProfileStore((state) => state.selectedProfileId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ entryId }: { entryId: string; section: HealthSectionKey }) =>
      healthService.removeHealthEntry(profileId!, entryId, accessToken!),
    onSuccess: (_data, variables) =>
      invalidateFor(queryClient, 'health-profile.write', profileId!, variables.section),
  });
}
