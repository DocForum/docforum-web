// Content-Security-Policy builder (issue #233).
//
// `connect-src` must allow exactly the origins the app actually talks to: the
// API, plus Sentry's ingest host when a DSN is configured and the analytics
// endpoint when one is configured. Nothing else — never a wildcard.
//
// The builder lives here rather than in `vite.config.ts` so it can be unit
// tested without loading the whole Vite config.

export interface CspOptions {
  /** Origin of the docforum-core API, already resolved to a bare origin. */
  apiOrigin: string;
  /** Raw `VITE_SENTRY_DSN`; the ingest origin is derived from it. */
  sentryDsn?: string | null;
  /** Raw `VITE_ANALYTICS_ENDPOINT`; its origin is added to `connect-src`. */
  analyticsEndpoint?: string | null;
}

function httpsOrigin(value: string, variable: string, example: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(
      `Invalid ${variable}: "${value}" is not a valid URL. The build needs an absolute https URL (for example ${example}) or the variable must be unset — a wrong value would silently break the CSP.`,
    );
  }
  if (parsed.protocol !== 'https:') {
    throw new Error(
      `Invalid ${variable}: "${value}" must use https, so its origin can be added to the production Content-Security-Policy. Unset it or use ${example}.`,
    );
  }
  return parsed.origin;
}

/**
 * Build the strict production CSP. Monitoring origins are appended to
 * `connect-src` only when configured; an unset variable leaves the policy
 * byte-for-byte as it was before monitoring existed.
 */
export function buildProductionCsp({
  apiOrigin,
  sentryDsn,
  analyticsEndpoint,
}: CspOptions): string {
  const connectSrc = ["'self'", apiOrigin];

  if (sentryDsn) {
    connectSrc.push(
      httpsOrigin(
        sentryDsn,
        'VITE_SENTRY_DSN',
        'https://<key>@o<org>.ingest.sentry.io/<project>',
      ),
    );
  }

  if (analyticsEndpoint) {
    connectSrc.push(
      httpsOrigin(
        analyticsEndpoint,
        'VITE_ANALYTICS_ENDPOINT',
        'https://analytics.example.com/api/event',
      ),
    );
  }

  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "font-src 'self'",
    `connect-src ${[...new Set(connectSrc)].join(' ')}`,
    "img-src 'self' data:",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'", // ignored in a meta tag; enforced via HTTP header where supported
    "require-trusted-types-for 'script'", // Chrome/Edge; no DOM XSS sinks in the app
  ].join('; ');
}
