// One sign-out path (issue #227).
//
// Every way a session can end must clear the same client state. Previously
// only the logout button and the idle-timeout controller did the full job;
// a failed refresh, account deletion and the mock dev sign-out left the
// profile/acting-for store (and sometimes the React Query cache) populated,
// so the next person on a shared tab could briefly see the previous user's
// data.
//
// `signOut` is that single helper. It deliberately does not import
// `query-client.ts`: that module imports `api-client.ts`, which needs to
// call `signOut` on a refresh failure. Instead the singleton registers
// itself here, and callers that already hold a client (hooks use
// `useQueryClient`) pass it directly so tests can assert against their own.
import type { QueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth-store';
import { useProfileStore } from '../store/profile-store';
import { useUnsavedChangesStore } from '../store/unsaved-changes-store';
import { clearCachedUserData } from '../pwa/caches';

export type SignOutReason =
  | 'logout'
  | 'idle-timeout'
  | 'session-expired'
  | 'account-deleted'
  | 'mock';

export interface SignOutOptions {
  /** The React Query client to clear. Defaults to the app singleton. */
  queryClient?: QueryClient;
}

let registeredQueryClient: QueryClient | null = null;

/** Called once by `src/query-client.ts` so module-level callers (the API
 * refresh path) can clear the app's cache without an import cycle. */
export function registerSignOutQueryClient(client: QueryClient): void {
  registeredQueryClient = client;
}

/**
 * Clear every piece of client state that belongs to the session:
 * React Query cache, profile/acting-for store, unsaved-changes registry,
 * auth session (which also drops the CSRF cookie) and app-owned
 * service-worker caches.
 *
 * The idle timeout is the only path that records a sign-out reason; all
 * others leave the user signed out without a notice.
 */
export async function signOut(
  reason: SignOutReason,
  options: SignOutOptions = {},
): Promise<void> {
  (options.queryClient ?? registeredQueryClient)?.clear();
  useProfileStore.getState().clearProfiles();
  useUnsavedChangesStore.getState().reset();

  if (reason === 'idle-timeout') {
    useAuthStore.getState().signOutDueToIdle();
  } else {
    useAuthStore.getState().clearSession();
  }

  // Hashed static assets stay cached so the offline shell still works.
  await clearCachedUserData();
}
