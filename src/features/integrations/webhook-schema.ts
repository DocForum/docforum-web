import { z } from 'zod';
import type { WebhookEventType } from '../../types/models';

/** Every event a facility can subscribe to (issue #287). Kept in one place so
 * the schema and the dialog cannot drift apart. */
export const WEBHOOK_EVENT_TYPES = [
  'order.created',
  'order.assigned',
  'order.fulfilled',
  'order.cancelled',
  'payment.released',
  'payment.refunded',
] as const satisfies readonly WebhookEventType[];

export interface WebhookSchemaOptions {
  /**
   * Allow `http://localhost` and `http://127.0.0.1` (local development and
   * mock builds only). Production builds must pass `false`: webhook payloads
   * carry order and patient events, so plain HTTP would send them
   * unencrypted.
   */
  allowInsecureLocalhost: boolean;
}

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1']);

function validateUrl(value: string, allowInsecureLocalhost: boolean): string | null {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    // `URL` accepts internationalised domain names and normalises them to
    // their ASCII (punycode) form, so `https://labo-ré.fr/…` passes here.
    return 'Enter a full URL, e.g. https://lab.example.test/webhooks/docforum.';
  }

  if (parsed.username || parsed.password) {
    return 'Remove the username and password from the URL. Webhook credentials must not be embedded in the endpoint.';
  }

  if (parsed.protocol === 'https:') return null;

  if (
    parsed.protocol === 'http:' &&
    allowInsecureLocalhost &&
    LOOPBACK_HOSTS.has(parsed.hostname)
  ) {
    return null;
  }

  if (parsed.protocol === 'http:') {
    return 'Webhook endpoints must use HTTPS so order and patient event data is not sent unencrypted.';
  }

  return 'Only HTTPS webhook endpoints are supported.';
}

/**
 * Validation for the create-webhook dialog (issue #287). The same rules are
 * a docforum-core follow-up: the server must reject non-HTTPS and
 * credentialed URLs too, because a client check alone can be bypassed.
 */
export function createWebhookSchema({ allowInsecureLocalhost }: WebhookSchemaOptions) {
  return z.object({
    url: z
      .string()
      .trim()
      .min(1, 'Endpoint URL is required.')
      .superRefine((value, ctx) => {
        const message = validateUrl(value, allowInsecureLocalhost);
        if (message) ctx.addIssue({ code: 'custom', message });
      }),
    events: z
      .array(z.enum(WEBHOOK_EVENT_TYPES))
      .min(1, 'Select at least one event.'),
  });
}
