import { publicRoutePathFromLocation } from '../pages/public-routes';

export const MOCK_ROUTER_BRIDGE_MARKER = 'mock-router-bridge';

export function usesHashRouter(): boolean {
  return import.meta.env.VITE_USE_HASH_ROUTER === 'true';
}

export function mockNavigate(path: string, options: { replace?: boolean } = {}): void {
  if (usesHashRouter()) {
    window.location.hash = path.startsWith('/') ? `#${path}` : path;
    return;
  }

  const currentState = (window.history.state ?? {}) as Record<string, unknown>;
  const currentIndex = typeof currentState.idx === 'number' ? currentState.idx : 0;
  const nextState = { ...currentState, idx: options.replace ? currentIndex : currentIndex + 1 };
  window.history[options.replace ? 'replaceState' : 'pushState'](nextState, '', path);
  const event =
    typeof PopStateEvent === 'function'
      ? new PopStateEvent('popstate', { state: nextState })
      : new Event('popstate');
  window.dispatchEvent(event);
}

export function isMockDeepLink(
  location: Pick<Location, 'pathname' | 'hash'> = window.location,
): boolean {
  if (usesHashRouter()) {
    return location.hash.startsWith('#/') && location.hash.length > 2;
  }

  const { pathname } = location;
  if (!pathname || pathname === '/' || pathname === '/index.html') return false;
  return publicRoutePathFromLocation(pathname, import.meta.env.BASE_URL) === null;
}
