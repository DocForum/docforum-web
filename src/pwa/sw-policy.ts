// Caching policy for the service worker, kept as pure functions so it can be
// unit-tested without a browser (issue #86).
//
// Hard rule: API responses are NEVER cached. docforum-core responses carry
// patient data; a stale or shared cache entry would be a privacy incident.
// Only the app shell and hashed static assets are precached, and every
// request that could carry user data is left to the network untouched.

/** Paths that must always go straight to the network, even same-origin. */
const USER_DATA_PATH_PREFIXES = ['/api/', '/account/', '/auth/'];

/**
 * True when a request must bypass the service worker's cache entirely.
 *
 * Cross-origin requests (the docforum-core API on Render) are never cached,
 * and same-origin API-looking paths are treated the same way defensively.
 */
export function shouldBypassCache(requestUrl: string, appOrigin: string): boolean {
  let url: URL;
  try {
    url = new URL(requestUrl, appOrigin);
  } catch {
    return true;
  }

  if (url.origin !== appOrigin) return true;

  return USER_DATA_PATH_PREFIXES.some((prefix) => url.pathname.includes(prefix));
}

/** Only same-origin navigation requests get the cached app shell. */
export function isAppShellNavigation(requestUrl: string, appOrigin: string): boolean {
  try {
    const url = new URL(requestUrl, appOrigin);
    return url.origin === appOrigin && !shouldBypassCache(requestUrl, appOrigin);
  } catch {
    return false;
  }
}

/** Cache names the app owns. Anything else is left alone on logout. */
export function isAppCacheName(name: string): boolean {
  return name.startsWith('workbox-') || name.startsWith('docforum-');
}

/**
 * Caches that must survive logout: precached static shell assets contain no
 * user data, and dropping them would break offline loading until the next SW
 * update.
 */
export function isPrecacheName(name: string): boolean {
  return name.startsWith('workbox-precache');
}
