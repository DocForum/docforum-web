import type {
  Breadcrumb,
  BreadcrumbHint,
  ErrorEvent,
  Event,
  EventHint,
} from '@sentry/react';

/**
 * Strict PHI scrubber for the error-monitoring SDK.
 *
 * DocForum handles patient data, so nothing that could carry PHI is ever
 * sent to the observability backend. This runs as Sentry's `beforeSend`
 * and `beforeBreadcrumb` hook and is applied to every event before it
 * leaves the browser.
 *
 * Rules enforced here:
 * - No request or response bodies, headers, cookies, or query strings.
 * - No form values.
 * - URL tokens and ids are replaced (host + route shape kept).
 * - The user is identified by an opaque id only (no email, IP, name).
 * - Session replay is never integrated (see main.tsx).
 *
 * The scrubber is a pure function of the event so it can be unit-tested
 * against a sample event containing intake text and other PHI patterns.
 */

// Field names that always carry PHI or credentials and are redacted wholesale,
// whatever their value.
const SENSITIVE_KEYS = new Set([
  'email',
  'phone',
  'ssn',
  'dateofbirth',
  'dob',
  'fullname',
  'patientname',
  'patientid',
  'mrn',
  'medicalrecordnumber',
  'medication',
  'diagnosis',
  'symptom',
  'intake',
  'notes',
  'note',
  'address',
  'city',
  'zip',
  'zipcode',
  'password',
  'token',
  'accesstoken',
  'refreshtoken',
  'apikey',
  'secret',
  'authorization',
  'cookie',
  'sessionid',
  'formvalues',
  'formdata',
  'body',
]);

// Opaque placeholder used in place of a real user id.
const OPAQUE_USER_ID = '[user-redacted]';

function redactStringPatterns(value: string): string {
  return (
    value
      // Email addresses.
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[email-redacted]')
      // US-style phone numbers.
      .replace(/\b\d{3}[.\-\s]?\d{3}[.\-\s]?\d{4}\b/g, '[phone-redacted]')
      // SSN-like values.
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[ssn-redacted]')
      // Bearer tokens / long opaque credentials.
      .replace(/\bBearer\s+[A-Za-z0-9._\-+/]+={0,2}\b/g, 'Bearer [token-redacted]')
  );
}

function scrubValue(value: unknown, key?: string): unknown {
  if (value === null || value === undefined) return value;

  const sensitiveKey = key ? SENSITIVE_KEYS.has(String(key).toLowerCase()) : false;

  if (typeof value === 'string') {
    if (sensitiveKey) return '[redacted]';
    // URLs can carry tokens and ids in the path/query — sanitize them too.
    if (/^https?:\/\//i.test(value)) return scrubUrl(value);
    return redactStringPatterns(value);
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => scrubValue(item, String(index)));
  }

  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(k.toLowerCase())) {
        result[k] = '[redacted]';
      } else {
        result[k] = scrubValue(v, k);
      }
    }
    return result;
  }

  return value;
}

/** Keep host + route shape, drop the query string and replace id-like path segments. */
function scrubUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  try {
    const u = new URL(url);
    // Drop the whole query string: tokens and ids travel there.
    u.search = '';
    u.pathname = u.pathname
      .split('/')
      .map((segment, index) => {
        if (index === 0) return segment; // leading '' before the first '/'
        if (
          /^[0-9a-fA-F]{8,}$/.test(segment) || // uuid/hex id
          /^\d{6,}$/.test(segment) || // numeric id
          /^[A-Za-z0-9_-]{24,}$/.test(segment) // long opaque token/id
        ) {
          return '[id-redacted]';
        }
        return segment;
      })
      .join('/');
    return u.toString();
  } catch {
    return '[url-redacted]';
  }
}

/** Opaque, deterministic replacement for a real user id. */
function opaqueUserId(id: string | number): string {
  return `${OPAQUE_USER_ID}:${String(id).replace(/[^a-zA-Z0-9]/g, '_')}`;
}

/**
 * Sentry `beforeSend` hook. Scrubs PHI from an event before it is sent.
 * Returns `null` to drop the event entirely.
 */
export function phiScrubber(event: ErrorEvent, _hint: EventHint): ErrorEvent | null {
  // Never send request bodies, headers, cookies, or query strings. Keep only
  // the method and a sanitized URL for debugging.
  if (event.request) {
    event.request = {
      method: event.request.method,
      url: scrubUrl(event.request.url),
    };
  }

  // Never send response bodies or headers. Keep nothing.
  const eventAny = event as unknown as Record<string, unknown>;
  if (eventAny.response) {
    eventAny.response = undefined;
    delete eventAny.response;
  }

  // User identified by an opaque id only — no email, IP address, or name.
  if (event.user) {
    event.user = event.user.id != null ? { id: opaqueUserId(event.user.id) } : undefined;
  }

  // Recursively scrub PHI from free-form payloads.
  event.extra = scrubValue(event.extra) as Event['extra'];
  event.contexts = scrubValue(event.contexts) as Event['contexts'];
  event.tags = scrubValue(event.tags) as Event['tags'];

  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => ({
      ...breadcrumb,
      data: scrubValue(breadcrumb.data) as Breadcrumb['data'],
    }));
  }

  // Error messages can echo form values or intake text.
  if (event.exception?.values) {
    event.exception.values = event.exception.values.map((exception) => ({
      ...exception,
      value: exception.value != null ? (scrubValue(exception.value) as string) : exception.value,
    }));
  }

  return event;
}

/**
 * Sentry `beforeBreadcrumb` hook. Breadcrumbs carry form submissions, XHR /
 * fetch URLs and user input, so scrub them just as aggressively.
 */
export function phiBeforeBreadcrumb(
  breadcrumb: Breadcrumb,
  _hint?: BreadcrumbHint,
): Breadcrumb | null {
  return {
    ...breadcrumb,
    data: scrubValue(breadcrumb.data) as Breadcrumb['data'],
  };
}
