// Privacy-preserving product analytics for DocForum.
//
// Design principles (issue #118):
// - Cookieless, aggregate, self-hostable (Plausible/Umami-compatible).
// - Disabled by default — only enabled when VITE_ANALYTICS_ENDPOINT is set.
// - Explicit event allowlist — no PHI, specialties, or search terms.
// - Strip ids and tokens from tracked URLs.
// - Respect Do Not Track / Global Privacy Control.
// - CSP must allow only the configured analytics origin.

// ─── Lazy env getters (so tests can stub envs after module load) ────────

function getEndpoint(): string | null {
  return import.meta.env.VITE_ANALYTICS_ENDPOINT ?? null;
}

function getDomain(): string | null {
  return import.meta.env.VITE_ANALYTICS_DOMAIN ?? null;
}

// ─── DNT / GPC check ─────────────────────────────────────────────────────

function isTrackingBlocked(): boolean {
  if (typeof navigator === 'undefined') return false;
  // DNT
  if (navigator.doNotTrack === '1' || (window as unknown as { doNotTrack?: string }).doNotTrack === '1') {
    return true;
  }
  // Global Privacy Control
  if ((navigator as unknown as { globalPrivacyControl?: boolean }).globalPrivacyControl === true) {
    return true;
  }
  return false;
}

// ─── URL scrubbing ────────────────────────────────────────────────────────
// Strip query strings entirely and replace UUIDs / numeric ids in the path
// with :id so no personal or PHI-bearing identifiers are sent.

const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const NUMERIC_ID_PATTERN = /\/\d+(?=\/|$)/g;

export function scrubUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Drop the query string entirely — it may contain tokens, search terms, ids.
    let path = parsed.pathname;
    // Replace UUIDs
    path = path.replace(UUID_PATTERN, ':id');
    // Replace numeric path segments
    path = path.replace(NUMERIC_ID_PATTERN, '/:id');
    // For hash routing, strip the #/ prefix if present so paths are clean
    const hash = parsed.hash;
    if (hash.startsWith('#/')) {
      let hashPath = hash.slice(1); // remove #
      hashPath = hashPath.replace(UUID_PATTERN, ':id');
      hashPath = hashPath.replace(NUMERIC_ID_PATTERN, '/:id');
      // Remove any query in the hash
      const queryIdx = hashPath.indexOf('?');
      if (queryIdx >= 0) hashPath = hashPath.slice(0, queryIdx);
      return hashPath;
    }
    return path || '/';
  } catch {
    return '/';
  }
}

// ─── Event allowlist ─────────────────────────────────────────────────────
// Explicit list of tracked events.  No event may carry PHI, specialties,
// or search terms.  The type system enforces this — only events listed
// here are accepted by trackEvent.

export const ALLOWED_EVENTS = [
  'pageview',
  'booking_started',
  'booking_completed',
  'signup_completed',
  'login_completed',
  'data_export_requested',
  'consultation_signed',
  'order_created',
] as const;

export type AnalyticsEvent = (typeof ALLOWED_EVENTS)[number];

// Properties for each event — all are non-PHI (counts and booleans only).
export interface AnalyticsEventProperties {
  booking_started?: { specialistCount: number };
  booking_completed?: { isNewPatient: boolean };
  signup_completed?: { role: 'patient' | 'doctor' };
  login_completed?: { role: 'patient' | 'doctor' | 'facility' | 'admin' };
  data_export_requested?: Record<string, never>;
  consultation_signed?: Record<string, never>;
  order_created?: { orderType: 'prescription' | 'lab_order' };
  pageview?: Record<string, never>;
}

// ─── Tracking ───────────────────────────────────────────────────────────

let lastPageviewPath: string | null = null;

function isEnabled(): boolean {
  if (isTrackingBlocked()) return false;
  return getEndpoint() !== null;
}

function send(payload: { event: string; path: string; props?: Record<string, unknown> }): void {
  if (!isEnabled()) return;

  const endpoint = getEndpoint()!;
  const domain = getDomain() ?? window.location.hostname;

  const body = JSON.stringify({
    ...payload,
    domain,
    referrer: document.referrer || null,
    screenWidth: window.innerWidth,
  });

  // Use sendBeacon for fire-and-forget; fall back to fetch.
  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' });
    navigator.sendBeacon(endpoint, blob);
  } else {
    void fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {
      // Swallow — analytics is best-effort.
    });
  }
}

export function trackPageview(url: string): void {
  const scrubbedPath = scrubUrl(url);
  // Deduplicate: don't send the same scrubbed path twice in a row.
  if (lastPageviewPath === scrubbedPath) return;
  lastPageviewPath = scrubbedPath;
  send({ event: 'pageview', path: scrubbedPath });
}

export function trackEvent<E extends AnalyticsEvent>(
  event: E,
  props?: AnalyticsEventProperties[E],
): void {
  send({ event, path: scrubUrl(window.location.href), props: props as Record<string, unknown> | undefined });
}

// Reset dedup state (for tests).
export function _resetAnalytics(): void {
  lastPageviewPath = null;
}
