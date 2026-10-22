import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/** Converts old #/path hash links to clean BrowserRouter paths on first load.
 *
 *  When the app migrates from HashRouter to BrowserRouter, old bookmarks and
 *  previously-sent email links still use the hash format (#/login, #/reset/abc).
 *  This shim detects a root-path load whose hash starts with #/ and replaces
 *  the history entry with the clean path, preserving any query string inside
 *  the hash.  It runs once on mount and then removes itself.
 *
 *  Only mounted in BrowserRouter mode — see main.tsx. */
export function HashRedirectShim() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only redirect from the root path (hash routing put everything after #).
    if (location.pathname !== '/' && location.pathname !== '') return;

    const hash = window.location.hash;
    if (!hash || !hash.startsWith('#/')) return;

    // Extract the path and any inner query string from the hash.
    let hashPath = hash.slice(1); // remove leading #
    if (hashPath.startsWith('/')) hashPath = hashPath.slice(1); // remove leading /

    // Split inner path and query.
    const queryIdx = hashPath.indexOf('?');
    let path = hashPath;
    let query = '';
    if (queryIdx >= 0) {
      path = hashPath.slice(0, queryIdx);
      query = hashPath.slice(queryIdx);
    }

    const cleanPath = `/${path}${query}`;
    // replace: true so the old hash URL doesn't linger in browser history.
    navigate(cleanPath, { replace: true });
  }, [navigate, location.pathname]);

  return null;
}
