// --- Phase W4 — API keys & webhooks for facility integrations (issue #55,
// docforum-core#125/#126) ----------------------------------------------------
// Assumed: docforum-core#125 (API keys with HMAC signing) and #126 (signed
// outbound webhooks) haven't landed. Shapes follow what those issues ask
// for — prefix-only key display, one-time secret on creation, signed webhook
// deliveries with redelivery. See ARCHITECTURE_ESSENTIALS.md "Known
// assumptions — Phase W4".

export interface FacilityApiKey {
  id: string;
  facilityId: string;
  name: string;
  /** Safe prefix shown in list, e.g. `df_live_a1b2…` — never the full secret. */
  prefix: string;
  /** Event scopes this key may access, e.g. `['orders.read']`. Empty = all. */
  scopes: string[];
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

/** Returned only from the create call — the secret is never retrievable again. */
export interface CreatedApiKey extends FacilityApiKey {
  /** Full secret including prefix. Store nowhere client-side. */
  secret: string;
}

export interface CreateApiKeyInput {
  name: string;
  scopes?: string[];
}

export type WebhookEventType =
  | 'order.created'
  | 'order.assigned'
  | 'order.fulfilled'
  | 'order.cancelled'
  | 'payment.released'
  | 'payment.refunded';

export interface WebhookEndpoint {
  id: string;
  facilityId: string;
  url: string;
  events: WebhookEventType[];
  /** Signing secret prefix (safe to display). Full secret shown once on create. */
  secretPrefix: string;
  active: boolean;
  lastDeliveryAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Returned only from the create call — the signing secret is never retrievable again. */
export interface CreatedWebhookEndpoint extends WebhookEndpoint {
  /** Full HMAC signing secret. Store nowhere client-side. */
  signingSecret: string;
}

export interface CreateWebhookInput {
  url: string;
  events: WebhookEventType[];
}

export type WebhookDeliveryStatus = 'pending' | 'success' | 'failed';

export interface WebhookDelivery {
  id: string;
  endpointId: string;
  event: WebhookEventType;
  status: WebhookDeliveryStatus;
  responseStatusCode: number | null;
  /** Short error message when failed; null otherwise. */
  errorMessage: string | null;
  attemptCount: number;
  deliveredAt: string | null;
  createdAt: string;
}

export interface RedeliverResponse {
  deliveryId: string;
  status: WebhookDeliveryStatus;
}
