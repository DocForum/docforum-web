// Route-level code splitting (issues #99, #112). Each page becomes its own
// chunk, fetched only when a route that renders it matches — a patient never
// downloads admin, doctor or facility screens.
//
// `lazy` (not `React.lazy`) so React Router loads the chunk *in parallel*
// with the route's loader: data prefetch and code download start together
// instead of one after the other (no render-then-fetch waterfall).
import type { ComponentType } from 'react';
import type { LazyRouteFunction, RouteObject } from 'react-router-dom';

/**
 * Lazily load a named page export as the route's `Component`.
 *
 *   { path: 'payments', lazy: lazyPage(() => import('../pages/PaymentHistoryPage'), 'PaymentHistoryPage') }
 */
export function lazyPage<M extends Record<string, unknown>, K extends keyof M & string>(
  load: () => Promise<M>,
  exportName: K,
): LazyRouteFunction<RouteObject> {
  return async () => {
    const module = await load();
    return { Component: module[exportName] as ComponentType };
  };
}
