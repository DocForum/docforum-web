// Facility API keys and webhook endpoints (issue #55).
import { http } from 'msw';
import { db } from '../db';
import { notFound, paramId, respond } from '../helpers';
import type {
  CreatedApiKey,
  CreatedWebhookEndpoint,
  CreateApiKeyInput,
  CreateWebhookInput,
  FacilityApiKey,
  WebhookDelivery,
  WebhookEndpoint,
  WebhookEventType,
} from '../../types/models';

function makeId(prefix: string): string {
  return `${prefix}-mock-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function randomSuffix(length: number): string {
  return Math.random().toString(36).slice(2, 2 + length);
}

export const integrationsHandlers = [
  // --- API keys -------------------------------------------------------------

  http.get(
    '*/facilities/:facilityId/api-keys',
    respond('list', () => db.apiKeys),
  ),

  http.post(
    '*/facilities/:facilityId/api-keys',
    respond('json', async ({ params, request }) => {
      const facilityId = paramId(params, 'facilityId');
      const body = (await request.json().catch(() => ({}))) as CreateApiKeyInput;
      const suffix = randomSuffix(24);
      const prefix = `df_live_${suffix.slice(0, 8)}`;
      const key: CreatedApiKey = {
        id: makeId('key'),
        facilityId,
        name: body.name ?? 'Untitled key',
        prefix,
        scopes: body.scopes ?? [],
        lastUsedAt: null,
        revokedAt: null,
        createdAt: new Date().toISOString(),
        secret: `df_live_${suffix}${randomSuffix(16)}`,
      };
      // Store without the secret — the mock API behaves like the real one.
      const stored: FacilityApiKey = {
        id: key.id,
        facilityId: key.facilityId,
        name: key.name,
        prefix: key.prefix,
        scopes: key.scopes,
        lastUsedAt: key.lastUsedAt,
        revokedAt: key.revokedAt,
        createdAt: key.createdAt,
      };
      db.apiKeys.push(stored);
      return key;
    }),
  ),

  http.delete(
    '*/facilities/:facilityId/api-keys/:keyId',
    respond('json', ({ params }) => {
      const key = db.apiKeys.find((k) => k.id === paramId(params, 'keyId'));
      if (!key) return notFound('API key');
      key.revokedAt = new Date().toISOString();
      return { success: true, keyId: key.id };
    }),
  ),

  // --- Webhook endpoints ----------------------------------------------------

  http.get(
    '*/facilities/:facilityId/webhooks',
    respond('list', () => db.webhookEndpoints),
  ),

  http.post(
    '*/facilities/:facilityId/webhooks',
    respond('json', async ({ params, request }) => {
      const facilityId = paramId(params, 'facilityId');
      const body = (await request.json().catch(() => ({}))) as CreateWebhookInput;
      const secret = `whsec_${randomSuffix(32)}`;
      const endpoint: CreatedWebhookEndpoint = {
        id: makeId('whk'),
        facilityId,
        url: body.url ?? 'https://example.test/webhook',
        events: (body.events ?? []) as WebhookEventType[],
        secretPrefix: secret.slice(0, 12),
        active: true,
        lastDeliveryAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        signingSecret: secret,
      };
      const stored: WebhookEndpoint = {
        id: endpoint.id,
        facilityId: endpoint.facilityId,
        url: endpoint.url,
        events: endpoint.events,
        secretPrefix: endpoint.secretPrefix,
        active: endpoint.active,
        lastDeliveryAt: endpoint.lastDeliveryAt,
        createdAt: endpoint.createdAt,
        updatedAt: endpoint.updatedAt,
      };
      db.webhookEndpoints.push(stored);
      return endpoint;
    }),
  ),

  http.delete(
    '*/facilities/:facilityId/webhooks/:endpointId',
    respond('json', ({ params }) => {
      const endpointId = paramId(params, 'endpointId');
      const exists = db.webhookEndpoints.some((w) => w.id === endpointId);
      if (!exists) return notFound('webhook endpoint');
      db.webhookEndpoints = db.webhookEndpoints.filter((w) => w.id !== endpointId);
      db.webhookDeliveries = db.webhookDeliveries.filter((d) => d.endpointId !== endpointId);
      return { success: true, endpointId };
    }),
  ),

  // --- Webhook deliveries ---------------------------------------------------

  http.get(
    '*/facilities/:facilityId/webhooks/:endpointId/deliveries',
    respond('list', ({ params }) => {
      const endpointId = paramId(params, 'endpointId');
      return db.webhookDeliveries.filter((d) => d.endpointId === endpointId);
    }),
  ),

  http.post(
    '*/facilities/:facilityId/webhooks/:endpointId/test',
    respond('json', ({ params }) => {
      const endpointId = paramId(params, 'endpointId');
      const endpoint = db.webhookEndpoints.find((w) => w.id === endpointId);
      if (!endpoint) return notFound('webhook endpoint');
      const now = new Date().toISOString();
      const delivery: WebhookDelivery = {
        id: makeId('whd'),
        endpointId,
        event: 'order.created',
        status: 'success',
        responseStatusCode: 200,
        errorMessage: null,
        attemptCount: 1,
        deliveredAt: now,
        createdAt: now,
      };
      db.webhookDeliveries.unshift(delivery);
      endpoint.lastDeliveryAt = now;
      return delivery;
    }),
  ),

  http.post(
    '*/facilities/:facilityId/webhooks/:endpointId/deliveries/:deliveryId/redeliver',
    respond('json', ({ params }) => {
      const delivery = db.webhookDeliveries.find(
        (d) => d.id === paramId(params, 'deliveryId'),
      );
      if (!delivery) return notFound('webhook delivery');
      const now = new Date().toISOString();
      delivery.status = 'success';
      delivery.responseStatusCode = 200;
      delivery.errorMessage = null;
      delivery.attemptCount += 1;
      delivery.deliveredAt = now;
      const endpoint = db.webhookEndpoints.find((w) => w.id === delivery.endpointId);
      if (endpoint) endpoint.lastDeliveryAt = now;
      return { deliveryId: delivery.id, status: delivery.status };
    }),
  ),
];
