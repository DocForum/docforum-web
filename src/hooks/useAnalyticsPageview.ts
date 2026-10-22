import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageview } from '../utils/analytics';

/** Tracks a pageview on every route change.  The analytics module is
 *  disabled unless VITE_ANALYTICS_ENDPOINT is set, so this hook is a
 *  no-op in most environments. */
export function useAnalyticsPageview(): void {
  const location = useLocation();

  useEffect(() => {
    const url = window.location.origin + window.location.pathname + window.location.search + window.location.hash;
    trackPageview(url);
  }, [location.pathname, location.search, location.hash]);
}
