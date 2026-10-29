// Persists ONLY docforum-core's per-session CSRF token across a page reload.
//
// Why this exists: `/auth/refresh` and `/auth/logout` are cookie-authenticated
// (`SameSite=None; Secure`, so any site can cause the browser to attach the
// refresh cookie). docforum-core therefore requires the session's `csrfToken`
// — returned in the login/signup/refresh body — in an `X-CSRF-Token` header
// on both routes (Phase 8, issue #37). On reload the in-memory copy is gone,
// so without persistence the boot refresh could never succeed.
//
// This is deliberately NOT the access token or the refresh token:
//   - the refresh token stays in docforum-core's httpOnly cookie;
//   - the access token stays in memory in `auth-store.ts`;
//   - this token alone cannot authenticate anything. It is the classic
//     double-submit anti-CSRF value, and the refresh cookie is still
//     required alongside it. It lives in a first-party cookie (not
//     localStorage/sessionStorage) so it disappears when the tab/session
//     cookie expires and is never sent to the API as a cookie — only echoed
//     back in the header.
// See ARCHITECTURE_ESSENTIALS.md "Known assumptions — CSRF token storage".
const CSRF_COOKIE = 'docforum_csrf';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // matches the refresh cookie's 30d

function isSecureContext(): boolean {
  return typeof window !== 'undefined' && window.location.protocol === 'https:';
}

export function readCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const prefix = `${CSRF_COOKIE}=`;
  const match = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  if (!match) return null;
  try {
    return decodeURIComponent(match.slice(prefix.length));
  } catch {
    return null;
  }
}

export function writeCsrfToken(token: string): void {
  if (typeof document === 'undefined') return;
  const secure = isSecureContext() ? '; Secure' : '';
  document.cookie = `${CSRF_COOKIE}=${encodeURIComponent(token)}; Path=/; SameSite=Lax; Max-Age=${MAX_AGE_SECONDS}${secure}`;
}

export function clearCsrfToken(): void {
  if (typeof document === 'undefined') return;
  const secure = isSecureContext() ? '; Secure' : '';
  document.cookie = `${CSRF_COOKIE}=; Path=/; SameSite=Lax; Max-Age=0${secure}`;
}
