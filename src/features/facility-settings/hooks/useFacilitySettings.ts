import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as settingsService from '../../../services/facility-settings-service';
import { useAuthStore } from '../../../store/auth-store';
import type { FacilityPriceInput, FacilitySettingsInput } from '../../../types/models';

export function useFacilitySettings(facilityId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ['facility', facilityId, 'settings'],
    queryFn: () => settingsService.getFacilitySettings(facilityId, accessToken!),
    enabled: Boolean(accessToken && facilityId),
  });
}

export function useUpdateFacilitySettings(facilityId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: FacilitySettingsInput) =>
      settingsService.updateFacilitySettings(facilityId, input, accessToken!),
    onSuccess: (updated) => {
      queryClient.setQueryData(['facility', facilityId, 'settings'], updated);
    },
  });
}

export function useFacilityPrices(facilityId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ['facility', facilityId, 'prices'],
    queryFn: () => settingsService.listFacilityPrices(facilityId, accessToken!),
    enabled: Boolean(accessToken && facilityId),
  });
}

export function useSearchCatalogItems() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useMutation({
    mutationFn: (query: string) => settingsService.searchCatalogItems(query, accessToken!),
  });
}

export function useCreateFacilityPrice(facilityId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: FacilityPriceInput) =>
      settingsService.createFacilityPrice(facilityId, input, accessToken!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facility', facilityId, 'prices'] });
    },
  });
}
