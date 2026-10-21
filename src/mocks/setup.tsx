// Mock-mode bootstrap. Dynamically imported by main.tsx only when running
// `npm run dev:mock` (a DEV build with VITE_ENABLE_MOCKS=true) — this
// keeps MSW, the fixtures, and the dev panel entirely out of production
// bundles (enforced in CI by `npm run check:dist`).
import { createRoot } from 'react-dom/client';
import { worker } from './browser';
import { DevPanel } from './DevPanel';
import { activateMockRole } from './roles';
import { useMockStore } from './mock-store';

/**
 * Start the mock API and mount the dev panel. Called by main.tsx via
 * top-level await BEFORE the first React render, so the persona session
 * exists when route guards first evaluate — otherwise RequireAuth would
 * bounce a deep-linked protected route to #/login before the mocks boot.
 */
export function startMockApi(): void {
  // `BASE_URL` is `/` in dev and the deployment's public path in a PR preview
  // (#104, e.g. `/docforum-web/pr-preview/pr-42/`). Registering the worker at
  // the root path would 404 under a subpath and the page would fall through to
  // the (deliberately invalid) API URL instead of the mocks.
  worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  });

  // Sign the persona in immediately. Navigate to the role's home screen
  // unless the URL already deep-links a route, which we leave untouched.
  // Logging in through the real login screen works too (handlers answer
  // any credentials).
  const hash = window.location.hash;
  const deepLinked = hash !== '' && hash !== '#/' && hash !== '#';
  activateMockRole(useMockStore.getState().activeRole, { navigate: !deepLinked });

  const panelRoot = document.createElement('div');
  panelRoot.id = 'mock-dev-panel-root';
  document.body.appendChild(panelRoot);
  createRoot(panelRoot).render(<DevPanel />);
}
