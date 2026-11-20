// Service worker (Workbox injectManifest strategy).
//
// Scope: app shell + hashed static assets only. There is deliberately no
// runtime caching: API responses are never stored, so logging out (or
// switching users on a shared device) cannot leave patient data in a cache.
// Logout additionally purges app-owned caches — see src/pwa/caches.ts.
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { isAppShellNavigation } from './sw-policy';

// Minimal service-worker typings. The app's tsconfig uses the DOM lib; pulling
// in lib.webworker here would conflict with it, and these are the only globals
// this worker touches.
interface ExtendableEventLike extends Event {
  waitUntil(promise: Promise<unknown>): void;
}
interface FetchEventLike extends ExtendableEventLike {
  request: Request;
  respondWith(response: Response | Promise<Response>): void;
}
interface MessageEventLike extends ExtendableEventLike {
  data?: unknown;
}
interface ServiceWorkerGlobalScopeLike {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
  location: Location;
  registration: ServiceWorkerRegistration;
  addEventListener(type: 'install', handler: (event: ExtendableEventLike) => void): void;
  addEventListener(type: 'activate', handler: (event: ExtendableEventLike) => void): void;
  addEventListener(type: 'fetch', handler: (event: FetchEventLike) => void): void;
  addEventListener(type: 'message', handler: (event: MessageEventLike) => void): void;
  skipWaiting(): Promise<void>;
  clients: { claim(): Promise<void> };
}

declare const self: ServiceWorkerGlobalScopeLike;

// Injected at build time with the hashed asset list.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

const appOrigin = new URL(self.registration.scope).origin;

// HashRouter means every route is served by index.html; deep links and
// refreshes resolve to the same shell.
//
// This is the worker's ONLY route. Precache handles the exact hashed asset
// URLs from the build; everything else (including every API call) matches no
// route, so Workbox never responds for it and never writes a cache entry.
// `isAppShellNavigation` additionally rejects cross-origin and API-looking
// navigations, so a crafted deep link cannot make the worker serve stale
// shell content for a data request.
registerRoute(
  ({ request, url }) => request.mode === 'navigate' && isAppShellNavigation(url.href, appOrigin),
  createHandlerBoundToURL('index.html'),
);

// Prompt-style updates: the "update available" UI posts this only when the
// user chooses to reload, so a new worker never takes over mid-consultation.
self.addEventListener('message', (event) => {
  if ((event.data as { type?: string } | undefined)?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('install', () => {
  // Do not skipWaiting automatically — see the message handler above.
});
