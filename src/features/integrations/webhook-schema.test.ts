import { describe, expect, it } from 'vitest';
import { createWebhookSchema } from './webhook-schema';

const production = createWebhookSchema({ allowInsecureLocalhost: false });
const development = createWebhookSchema({ allowInsecureLocalhost: true });

const validEvents = ['order.created'] as const;

function urlError(schema: ReturnType<typeof createWebhookSchema>, url: string) {
  const result = schema.safeParse({ url, events: [...validEvents] });
  return result.success ? null : result.error.issues[0]?.message;
}

describe('createWebhookSchema — URL', () => {
  it('accepts HTTPS URLs', () => {
    expect(urlError(production, 'https://lab.example.test/webhooks/docforum')).toBeNull();
    expect(
      production.safeParse({
        url: 'https://lab.example.test/webhooks/docforum',
        events: [...validEvents],
      }).success,
    ).toBe(true);
  });

  it('accepts internationalised domain names', () => {
    expect(urlError(production, 'https://labo-ré.fr/webhooks/docforum')).toBeNull();
  });

  it('rejects plain HTTP outside development', () => {
    expect(urlError(production, 'http://lab.example.test/webhooks/docforum')).toMatch(
      /must use HTTPS/i,
    );
  });

  it('allows http://localhost and http://127.0.0.1 in development only', () => {
    expect(urlError(development, 'http://localhost:4000/webhooks/docforum')).toBeNull();
    expect(urlError(development, 'http://127.0.0.1:4000/webhooks/docforum')).toBeNull();
    expect(urlError(production, 'http://localhost:4000/webhooks/docforum')).toMatch(
      /must use HTTPS/i,
    );
    expect(urlError(production, 'http://127.0.0.1:4000/webhooks/docforum')).toMatch(
      /must use HTTPS/i,
    );
  });

  it('does not treat a lookalike host as localhost', () => {
    expect(urlError(development, 'http://localhost.example.test/hook')).toMatch(
      /must use HTTPS/i,
    );
  });

  it('rejects URLs with embedded credentials', () => {
    expect(urlError(production, 'https://user:pass@lab.example.test/hook')).toMatch(
      /username and password/i,
    );
    expect(urlError(production, 'https://user@lab.example.test/hook')).toMatch(
      /username and password/i,
    );
  });

  it('rejects non-HTTP protocols and malformed URLs', () => {
    expect(urlError(production, 'ftp://lab.example.test/hook')).toMatch(
      /Only HTTPS/i,
    );
    expect(urlError(production, 'not a url')).toMatch(/Enter a full URL/i);
  });

  it('requires a URL', () => {
    expect(urlError(production, '   ')).toMatch(/required/i);
  });
});

describe('createWebhookSchema — events', () => {
  it('requires at least one event', () => {
    const result = production.safeParse({ url: 'https://lab.example.test/hook', events: [] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Select at least one event.');
    }
  });

  it('accepts every known event', () => {
    const result = production.safeParse({
      url: 'https://lab.example.test/hook',
      events: [
        'order.created',
        'order.assigned',
        'order.fulfilled',
        'order.cancelled',
        'payment.released',
        'payment.refunded',
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects unknown events', () => {
    const result = production.safeParse({
      url: 'https://lab.example.test/hook',
      events: ['order.created', 'not.an.event'],
    });
    expect(result.success).toBe(false);
  });
});
