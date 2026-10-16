import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as healthService from '../../../services/health-profile-service';
import { useAuthStore } from '../../../store/auth-store';
import { useProfileStore } from '../../../store/profile-store';
import type { HealthEntryInput, HealthSectionKey } from '../../../types/models';

function healthKey(profileId: string, section: HealthSectionKey) {
  return ['health', profileId, section] as const;
}

export function useHealthEntries(section: HealthSectionKey) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const profileId = useProfileStore((state) => state.selectedProfileId);

  return useQuery({
    queryKey: healthKey(profileId!, section),
    queryFn: () => healthService.listHealthEntries(profileId!, section, accessToken!),
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
      queryClient.invalidateQueries({ queryKey: healthKey(profileId!, variables.section) });
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
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: healthKey(profileId!, variables.section) });
    },
  });
}

export function useRemoveHealthEntry() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const profileId = useProfileStore((state) => state.selectedProfileId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ entryId }: { entryId: string; section: HealthSectionKey }) =>
      healthService.removeHealthEntry(profileId!, entryId, accessToken!),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: healthKey(profileId!, variables.section) });
    },
  });
}
