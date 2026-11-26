import { isAppCacheName, isPrecacheName } from './sw-policy';

/**
 * Delete every app-owned cache on logout (issue #86).
 *
 * The worker never caches API responses, so this is defence in depth: if a
 * future caching rule ever stores something derived from a session, signing
 * out still removes it. Precache entries are kept — they are hashed static
 * assets only, and keeping them means the offline shell still works after
 * logging out.
 */
export async function clearCachedUserData(): Promise<void> {
  if (typeof caches === 'undefined') return;

  const names = await caches.keys();
  const userDataCaches = names.filter((name) => isAppCacheName(name) && !isPrecacheName(name));
  await Promise.all(userDataCaches.map((name) => caches.delete(name)));
}
