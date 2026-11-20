import { describe, expect, it } from 'vitest';
import { isAppCacheName, isAppShellNavigation, isPrecacheName, shouldBypassCache } from './sw-policy';

const ORIGIN = 'https://docforum.github.io';

describe('service worker caching policy', () => {
  it('never caches API responses, even when the API is same-origin', () => {
    expect(shouldBypassCache('https://docforum-core-api.onrender.com/auth/login', ORIGIN)).toBe(true);
    expect(shouldBypassCache('https://docforum-core-api.onrender.com/patients/me/dependents', ORIGIN)).toBe(true);
    expect(shouldBypassCache(`${ORIGIN}/api/patients`, ORIGIN)).toBe(true);
    expect(shouldBypassCache(`${ORIGIN}/account/data-export`, ORIGIN)).toBe(true);
    expect(shouldBypassCache(`${ORIGIN}/auth/logout`, ORIGIN)).toBe(true);
  });

  it('allows the worker to serve the app shell for same-origin navigations', () => {
    expect(shouldBypassCache(`${ORIGIN}/docforum-web/`, ORIGIN)).toBe(false);
    expect(isAppShellNavigation(`${ORIGIN}/docforum-web/`, ORIGIN)).toBe(true);
    expect(isAppShellNavigation(`${ORIGIN}/`, ORIGIN)).toBe(true);
  });

  it('does not treat cross-origin navigations as app-shell requests', () => {
    expect(isAppShellNavigation('https://docforum-core-api.onrender.com/openapi.json', ORIGIN)).toBe(false);
  });

  it('treats malformed URLs as uncacheable', () => {
    expect(shouldBypassCache('http://[::1', ORIGIN)).toBe(true);
  });

  it('only recognises its own cache namespaces', () => {
    expect(isAppCacheName('workbox-precache-v2-https://docforum.github.io/')).toBe(true);
    expect(isAppCacheName('docforum-user-data')).toBe(true);
    expect(isAppCacheName('some-other-app-cache')).toBe(false);
    expect(isPrecacheName('workbox-precache-v2-https://docforum.github.io/')).toBe(true);
    expect(isPrecacheName('workbox-runtime-https://docforum.github.io/')).toBe(false);
  });
});
