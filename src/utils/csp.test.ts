import { describe, expect, it } from 'vitest';
import { buildProductionCsp } from './csp';

const API_ORIGIN = 'https://api.docforum.example';

function connectSrc(csp: string): string {
  const directive = csp.split('; ').find((part) => part.startsWith('connect-src'));
  if (!directive) throw new Error('connect-src directive missing');
  return directive;
}

describe('buildProductionCsp', () => {
  it('allows only self and the API origin when no monitoring is configured', () => {
    const csp = buildProductionCsp({ apiOrigin: API_ORIGIN });

    expect(connectSrc(csp)).toBe(`connect-src 'self' ${API_ORIGIN}`);
  });

  it('derives the Sentry ingest origin from the DSN when it is set', () => {
    const csp = buildProductionCsp({
      apiOrigin: API_ORIGIN,
      sentryDsn: 'https://public-key@o42.ingest.sentry.io/123456',
    });

    expect(connectSrc(csp)).toBe(
      `connect-src 'self' ${API_ORIGIN} https://o42.ingest.sentry.io`,
    );
  });

  it('adds the analytics origin when the endpoint is set', () => {
    const csp = buildProductionCsp({
      apiOrigin: API_ORIGIN,
      analyticsEndpoint: 'https://analytics.example.com/api/event',
    });

    expect(connectSrc(csp)).toBe(
      `connect-src 'self' ${API_ORIGIN} https://analytics.example.com`,
    );
  });

  it('adds both origins, without duplicates, when both are set', () => {
    const csp = buildProductionCsp({
      apiOrigin: API_ORIGIN,
      sentryDsn: 'https://public-key@o42.ingest.sentry.io/123456',
      analyticsEndpoint: 'https://analytics.example.com/api/event',
    });

    expect(connectSrc(csp)).toBe(
      `connect-src 'self' ${API_ORIGIN} https://o42.ingest.sentry.io https://analytics.example.com`,
    );
  });

  it('never widens to a wildcard or a scheme', () => {
    const csp = buildProductionCsp({
      apiOrigin: API_ORIGIN,
      sentryDsn: 'https://public-key@o42.ingest.sentry.io/123456',
      analyticsEndpoint: 'https://analytics.example.com/api/event',
    });

    const directive = connectSrc(csp);
    expect(directive).not.toContain('*');
    expect(directive).not.toContain('https: ');
    expect(directive).not.toContain('http://');
  });

  it('fails with a clear message when the DSN is not a valid URL', () => {
    expect(() => buildProductionCsp({ apiOrigin: API_ORIGIN, sentryDsn: 'not-a-url' })).toThrow(
      /VITE_SENTRY_DSN/,
    );
  });

  it('fails when the analytics endpoint is not an https URL', () => {
    expect(() =>
      buildProductionCsp({
        apiOrigin: API_ORIGIN,
        analyticsEndpoint: 'http://analytics.example.com/api/event',
      }),
    ).toThrow(/VITE_ANALYTICS_ENDPOINT/);
  });

  it('fails when the DSN uses a non-https scheme', () => {
    expect(() =>
      buildProductionCsp({ apiOrigin: API_ORIGIN, sentryDsn: 'http://sentry.example.com/1' }),
    ).toThrow(/https/);
  });
});
