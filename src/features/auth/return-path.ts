import type { Role } from '../../types/models';

/**
 * Where each role lands when there is no safe page to return to (issue #226).
 * Mirrors the role-prefixed route areas in `src/routes/`.
 */
export const ROLE_HOME: Record<Role, string> = {
  patient: '/patient',
  doctor: '/doctor',
  facility: '/facility',
  admin: '/admin',
};

/**
 * Route areas each role may be returned to after signing in. Deliberately an
 * allowlist, not a blocklist: `RequireAuth` records whatever page was asked
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
 * Turn the `returnTo` value recorded by `RequireAuth` into a destination that
 * is safe for `role`.
 *
 * Only same-app absolute paths are accepted; anything external, relative,
 * protocol-relative, malformed or outside the role's own routes falls back to
 * the role home. Never put this value in a query param: router state keeps it
 * out of the URL (and out of any redirect an attacker could craft a link to).
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
