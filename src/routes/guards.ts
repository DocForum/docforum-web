// Loader-based route guards (issue #112). They replace the old
// `<RequireAuth>` wrapper component: the decision is made before the route's
// code or data loads, so a signed-out visitor never downloads a role's page
// chunk or fires its queries, and a redirect happens before anything renders.
//
// The guard keeps the one behaviour `RequireAuth` had to get right: it waits
// for the boot-time session restore (issue #9) instead of redirecting a
// signed-in user to /login just because `POST /auth/refresh` hasn't answered
// yet. While it waits, the guarded route's `HydrateFallback`
// (`SessionRestoring`) is shown inside the normal layout.
import { redirect, type LoaderFunctionArgs } from 'react-router-dom';
import { rememberReturnPath } from '../features/auth/return-path';
import { useAuthStore } from '../store/auth-store';
import type { Role } from '../types/models';

/** Every signed-in role. For routes any account may open (inbox, settings). */
export const ANY_ROLE: readonly Role[] = ['patient', 'doctor', 'facility', 'admin'];

/**
 * Resolves once the boot session restore is no longer in flight. Resolves
 * immediately when it already finished, was never started (`idle` — tests,
 * prerender) or when a session already exists.
 */
export function waitForSessionRestore(): Promise<void> {
  if (useAuthStore.getState().status !== 'resolving') return Promise.resolve();
  return new Promise((resolve) => {
    const unsubscribe = useAuthStore.subscribe((state) => {
      if (state.status === 'resolving') return;
      unsubscribe();
      resolve();
    });
  });
}

/** What a guard decides for the current session, without side effects.
 * Shared by the loader and by `RoleGate`, so both always agree. */
export function guardDecision(allowedRoles: readonly Role[]): 'allow' | '/login' | '/' {
  const { user } = useAuthStore.getState();
  if (!user) return '/login';
  if (!allowedRoles.includes(user.role)) return '/';
  return 'allow';
}

/** Runs after the guard allows the route; may prefetch data. Receives the
 * loader args (params etc.) and the current access token. */
export type GuardedPrefetch = (args: LoaderFunctionArgs, accessToken: string) => Promise<unknown> | void;

/**
 * Loader factory for a role-guarded section. Waits for session restore,
 * then redirects exactly where `RequireAuth` used to (`/login` when signed
 * out, `/` when the role isn't allowed), and otherwise runs `prefetch`.
 *
 * Redirects thrown from a loader replace the pending navigation, so the
 * guarded URL never lands in history — the same as `<Navigate replace>`.
 *
 * A redirect Response cannot carry router state, so when the visit is bounced
 * to `/login` the attempted path is remembered in memory for `LoginPage` to
 * consume after a successful sign-in (issue #226).
 */
export function requireRoles(allowedRoles: readonly Role[], prefetch?: GuardedPrefetch) {
  return async (args: LoaderFunctionArgs): Promise<null> => {
    await waitForSessionRestore();
    const decision = guardDecision(allowedRoles);
    if (decision === '/login') rememberReturnPath(args.request.url);
    if (decision !== 'allow') throw redirect(decision);
    const token = useAuthStore.getState().accessToken;
    if (prefetch && token) await prefetch(args, token);
    return null;
  };
}
