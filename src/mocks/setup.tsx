// Mock-mode bootstrap. Dynamically imported by main.tsx for local dev
// (`npm run dev:mock`, a DEV build with VITE_ENABLE_MOCKS=true) and for a
// PR preview build (VITE_PREVIEW_MOCKS=true) — this keeps MSW, the fixtures,
// and the dev panel entirely out of normal production bundles (enforced in CI
// by `npm run check:dist`).
import { createRoot } from 'react-dom/client';
import { worker } from './browser';
import { DevPanel } from './DevPanel';
import { activateMockRole } from './roles';
import { useMockStore } from './mock-store';

/**
 * Start the mock API and mount the dev panel. Called by main.tsx before the
 * first React render, so the persona session exists when route guards first
 * evaluate — otherwise RequireAuth would bounce a deep-linked protected route
 * to #/login before the mocks boot.
 */
export async function startMockApi(): Promise<void> {
  // `BASE_URL` is `/` in dev and can be a subpath when the app is hosted
  // under one. Registering the worker at the root path would 404 there and the
  // page would fall through to the (deliberately invalid) API URL instead of
  // the mocks.
  await worker.start({
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
