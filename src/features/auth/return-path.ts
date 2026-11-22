import { ROLE_HOME } from '../../navigation/role-home';
import type { Role } from '../../types/models';

/**
 * Where each role lands when there is no safe page to return to (issue #226).
 * Re-exported from `src/navigation/role-home.ts`, the single source of truth.
 */
export { ROLE_HOME };

/**
 * Route areas each role may be returned to after signing in. Deliberately an
 * allowlist, not a blocklist: the route guard records whatever page was asked
 * for, and a stale or crafted value must never send a user somewhere another
 * role owns. Shared routes are listed per role exactly as their guards declare
 * them (`/care` is patient+doctor; the notifications pages are all roles).
 */
const ALLOWED_PREFIXES: Record<Role, readonly string[]> = {
  patient: [
    '/patient',
    '/care',
    '/appointments',
    '/payments',
    '/account/access-log',
    '/notifications',
    '/settings/notifications',
  ],
  doctor: ['/doctor', '/care', '/notifications', '/settings/notifications'],
  facility: ['/facility', '/notifications', '/settings/notifications'],
  admin: ['/admin', '/notifications', '/settings/notifications'],
};

// Any origin works — only `pathname`/`search`/`hash` of a same-app path are
// kept. Parsing also normalises `..` segments and protocol-relative URLs.
const PLACEHOLDER_ORIGIN = 'https://docforum.invalid';

function matchesArea(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isPathAllowedForRole(pathname: string, role: Role): boolean {
  return ALLOWED_PREFIXES[role].some((prefix) => matchesArea(pathname, prefix));
}

/**
 * A loader redirect is an HTTP-style `Response`, so router state cannot ride
 * along with it. The guard records the attempted path here instead: in memory
 * for this tab only, never in the URL, `localStorage` or `sessionStorage`.
 */
let pendingReturnPath: string | null = null;

/** Record the page a signed-out visitor was trying to open, as a path. */
export function rememberReturnPath(requestUrl: string): void {
  try {
    const url = new URL(requestUrl, PLACEHOLDER_ORIGIN);
    pendingReturnPath = `${url.pathname}${url.search}${url.hash}`;
  } catch {
    pendingReturnPath = null;
  }
}

/** Read and clear the recorded path, so it is used for one sign-in only. */
export function takeReturnPath(): string | undefined {
  const pending = pendingReturnPath;
  pendingReturnPath = null;
  return pending ?? undefined;
}

/**
 * Turn the path recorded by the route guard into a destination that is safe
 * for `role`.
 *
 * Only same-app absolute paths are accepted; anything external, relative,
 * protocol-relative, malformed or outside the role's own routes falls back to
 * the role home. Never put this value in a query param: in-memory state keeps
 * it out of the URL (and out of any redirect an attacker could craft a link
 * to).
 */
export function safeReturnPath(raw: unknown, role: Role): string {
  const home = ROLE_HOME[role];
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 2048) return home;
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return home;

  let url: URL;
  try {
    url = new URL(raw, PLACEHOLDER_ORIGIN);
  } catch {
    return home;
  }

  if (url.origin !== PLACEHOLDER_ORIGIN) return home;
  if (!isPathAllowedForRole(url.pathname, role)) return home;

  return `${url.pathname}${url.search}${url.hash}`;
}
