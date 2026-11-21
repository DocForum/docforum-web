// Browser router construction (issue #112).
//
// BrowserRouter semantics by default; HashRouter semantics only when
// VITE_USE_HASH_ROUTER=true (the GitHub Pages build — see
// docs/adr/0001-routing-strategy.md and deploy-pages.yml). Same choice as the
// old `<BrowserRouter>`/`<HashRouter>` switch, now as data routers.
import type { QueryClient } from '@tanstack/react-query';
import { createBrowserRouter, createHashRouter, matchRoutes, type RouteObject } from 'react-router-dom';
import { createAppRoutes } from './routes';

const useHashRouter = import.meta.env.VITE_USE_HASH_ROUTER === 'true';

/** The path React Router will read on boot, for either history mode. */
export function initialRouterPath(location: Pick<Location, 'pathname' | 'search' | 'hash'>, hash: boolean): string {
  if (hash) return location.hash.replace(/^#/, '') || '/';
  return location.pathname + location.search;
}

/**
 * Load the lazy route modules the first URL needs *before* the first render,
 * React Router's documented pattern for lazy routes on initial load. Without
 * it the matched page renders nothing until its chunk arrives, which would
 * replace the pre-hydration loading shell (or the prerendered public page)
 * with an empty `<main>` — a visible flash and a layout shift (CLS budget,
 * issue #99). Loaders still run normally after this; only code is awaited.
 */
export async function resolveInitialLazyRoutes(routes: RouteObject[], path: string): Promise<void> {
  const matches = matchRoutes(routes, path) ?? [];
  await Promise.all(
    matches.map(async ({ route }) => {
      if (typeof route.lazy !== 'function') return;
      const resolved = await route.lazy();
      Object.assign(route, { ...resolved, lazy: undefined });
    }),
  );
}

export async function createAppRouter(queryClient: QueryClient) {
  const routes = createAppRoutes({ queryClient });
  // A failed chunk here must not block boot: the router retries the lazy
  // route itself and shows the section's errorElement if it fails again.
  await resolveInitialLazyRoutes(routes, initialRouterPath(window.location, useHashRouter)).catch(
    (error: unknown) => console.error('Preloading the first route failed', error),
  );
  return useHashRouter ? createHashRouter(routes) : createBrowserRouter(routes);
}
