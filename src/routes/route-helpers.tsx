// Building blocks shared by the per-area route files (issue #112).
import type { QueryClient } from '@tanstack/react-query';
import type { RouteObject } from 'react-router-dom';
import { RouteErrorElement } from '../components/RouteErrorElement';
import { SessionRestoring } from '../components/SessionRestoring';
import type { Role } from '../types/models';
import { requireRoles, type GuardedPrefetch } from './guards';
import { RoleGate } from './RoleGate';

/** What every area's route factory receives. The query client is passed in
 * (not imported) so tests and the prerender use their own isolated cache. */
export interface RouteContext {
  queryClient: QueryClient;
}

/**
 * How long a loader waits for prefetched data before letting the page
 * render anyway. Within the budget the page appears with its data (no
 * spinner flash); past it — typically a cold-starting backend — the page
 * renders its own loading state while the same request keeps going in the
 * background (React Query dedupes it, so the page never fetches twice).
 */
export const PREFETCH_BUDGET_MS = 2_000;

/**
 * Waits for prefetches to settle or for the budget to run out, whichever is
 * first. Never rejects: a failed prefetch leaves the query in its error
 * state and the page shows its usual error UI with a retry, rather than the
 * whole route failing.
 */
export function settlePrefetch(
  prefetches: Array<Promise<unknown>>,
  budgetMs: number = PREFETCH_BUDGET_MS,
): Promise<void> {
  if (prefetches.length === 0) return Promise.resolve();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const budget = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, budgetMs);
  });
  return Promise.race([Promise.allSettled(prefetches).then(() => undefined), budget]).finally(() => {
    clearTimeout(timer);
  });
}

/** A child of a guarded section: a normal route object plus an optional
 * prefetch that runs only after the guard allows the visit. */
export type GuardedRoute = Omit<RouteObject, 'loader' | 'children' | 'index'> & {
  prefetch?: GuardedPrefetch;
};

/**
 * A role-guarded section: one pathless route owning the guard UI
 * (`RoleGate`) and an `errorElement`, with every child loader running
 * `requireRoles` first. The guard sits on each child (not only the parent)
 * because React Router runs parent and child loaders in parallel — putting
 * it on the child is what guarantees no prefetch fires before the guard has
 * decided.
 */
export function guardedSection(
  id: string,
  allowedRoles: readonly Role[],
  children: GuardedRoute[],
): RouteObject {
  return {
    id,
    element: <RoleGate allowedRoles={allowedRoles} />,
    errorElement: <RouteErrorElement level="route" />,
    children: children.map(({ prefetch, ...route }) => ({
      ...route,
      loader: requireRoles(allowedRoles, prefetch),
      hydrateFallbackElement: <SessionRestoring />,
    })),
  };
}
