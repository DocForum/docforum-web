import { apiFetch } from './api-client';
import type {
  FacilityApiKey,
  CreatedApiKey,
  CreateApiKeyInput,
  WebhookEndpoint,
  CreatedWebhookEndpoint,
  CreateWebhookInput,
  WebhookDelivery,
  RedeliverResponse,
} from '../types/models';

// --- API keys -----------------------------------------------------------------

export function listApiKeys(facilityId: string, accessToken: string): Promise<FacilityApiKey[]> {
  return apiFetch<FacilityApiKey[]>(`/facilities/${facilityId}/api-keys`, { accessToken });
}

export function createApiKey(
  facilityId: string,
  input: CreateApiKeyInput,
  accessToken: string,
): Promise<CreatedApiKey> {
  return apiFetch<CreatedApiKey>(`/facilities/${facilityId}/api-keys`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}

export function revokeApiKey(
  facilityId: string,
  keyId: string,
  accessToken: string,
): Promise<{ success: boolean; keyId: string }> {
  return apiFetch<{ success: boolean; keyId: string }>(
    `/facilities/${facilityId}/api-keys/${keyId}`,
    { method: 'DELETE', accessToken },
  );
}

// --- Webhook endpoints -------------------------------------------------------

export function listWebhookEndpoints(
  facilityId: string,
  accessToken: string,
): Promise<WebhookEndpoint[]> {
  return apiFetch<WebhookEndpoint[]>(`/facilities/${facilityId}/webhooks`, { accessToken });
}

export function createWebhookEndpoint(
  facilityId: string,
  input: CreateWebhookInput,
  accessToken: string,
): Promise<CreatedWebhookEndpoint> {
  return apiFetch<CreatedWebhookEndpoint>(`/facilities/${facilityId}/webhooks`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}

export function deleteWebhookEndpoint(
  facilityId: string,
  endpointId: string,
  accessToken: string,
): Promise<{ success: boolean; endpointId: string }> {
  return apiFetch<{ success: boolean; endpointId: string }>(
    `/facilities/${facilityId}/webhooks/${endpointId}`,
    { method: 'DELETE', accessToken },
  );
}

// --- Webhook deliveries ------------------------------------------------------

export function listWebhookDeliveries(
  facilityId: string,
  endpointId: string,
  accessToken: string,
): Promise<WebhookDelivery[]> {
  return apiFetch<WebhookDelivery[]>(
    `/facilities/${facilityId}/webhooks/${endpointId}/deliveries`,
    { accessToken },
  );
}

export function sendTestDelivery(
  facilityId: string,
  endpointId: string,
  accessToken: string,
): Promise<WebhookDelivery> {
  return apiFetch<WebhookDelivery>(
    `/facilities/${facilityId}/webhooks/${endpointId}/test`,
    { method: 'POST', accessToken },
  );
}

export function redeliverWebhook(
  facilityId: string,
  endpointId: string,
  deliveryId: string,
  accessToken: string,
): Promise<RedeliverResponse> {
  return apiFetch<RedeliverResponse>(
    `/facilities/${facilityId}/webhooks/${endpointId}/deliveries/${deliveryId}/redeliver`,
    { method: 'POST', accessToken },
  );
}
