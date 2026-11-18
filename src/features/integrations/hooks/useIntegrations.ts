import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as integrationsService from '../../../services/integrations-service';
import { useAuthStore } from '../../../store/auth-store';
import type {
  CreateApiKeyInput,
  CreateWebhookInput,
} from '../../../types/models';

// --- API keys hooks ----------------------------------------------------------

export function useApiKeys(facilityId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ['facility', facilityId, 'api-keys'],
    queryFn: () => integrationsService.listApiKeys(facilityId, accessToken!),
    enabled: Boolean(accessToken && facilityId),
  });
}

export function useCreateApiKey(facilityId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateApiKeyInput) =>
      integrationsService.createApiKey(facilityId, input, accessToken!),
    // The result carries the one-time secret: never retain it in the
    // MutationCache after the dialog closes.
    gcTime: 0,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facility', facilityId, 'api-keys'] });
    },
  });
}

export function useRevokeApiKey(facilityId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (keyId: string) =>
      integrationsService.revokeApiKey(facilityId, keyId, accessToken!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facility', facilityId, 'api-keys'] });
    },
  });
}

// --- Webhook endpoints hooks -------------------------------------------------

export function useWebhookEndpoints(facilityId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ['facility', facilityId, 'webhooks'],
    queryFn: () => integrationsService.listWebhookEndpoints(facilityId, accessToken!),
    enabled: Boolean(accessToken && facilityId),
  });
}

export function useCreateWebhookEndpoint(facilityId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateWebhookInput) =>
      integrationsService.createWebhookEndpoint(facilityId, input, accessToken!),
    // The result carries the one-time signing secret: never retain it in the
    // MutationCache after the dialog closes.
    gcTime: 0,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facility', facilityId, 'webhooks'] });
    },
  });
}

export function useDeleteWebhookEndpoint(facilityId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (endpointId: string) =>
      integrationsService.deleteWebhookEndpoint(facilityId, endpointId, accessToken!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facility', facilityId, 'webhooks'] });
    },
  });
}

// --- Webhook deliveries hooks ------------------------------------------------

export function useWebhookDeliveries(facilityId: string, endpointId: string | null) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ['facility', facilityId, 'webhooks', endpointId, 'deliveries'],
    queryFn: () =>
      integrationsService.listWebhookDeliveries(facilityId, endpointId!, accessToken!),
    enabled: Boolean(accessToken && facilityId && endpointId),
  });
}

export function useSendTestDelivery(facilityId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (endpointId: string) =>
      integrationsService.sendTestDelivery(facilityId, endpointId, accessToken!),
    onSuccess: (_data, endpointId) => {
      queryClient.invalidateQueries({
        queryKey: ['facility', facilityId, 'webhooks', endpointId, 'deliveries'],
      });
    },
  });
}

export function useRedeliverWebhook(facilityId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ endpointId, deliveryId }: { endpointId: string; deliveryId: string }) =>
      integrationsService.redeliverWebhook(facilityId, endpointId, deliveryId, accessToken!),
    onSuccess: (_data, { endpointId }) => {
      queryClient.invalidateQueries({
        queryKey: ['facility', facilityId, 'webhooks', endpointId, 'deliveries'],
      });
    },
  });
}
