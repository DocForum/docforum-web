// Entry point for the public demo. Dynamically imported by main.tsx only
// when the URL carries `?demo=1`, so MSW, the fixtures/handlers and the
// banner are emitted as their own lazy chunk that a normal session never
// downloads (see `npm run check:dist`).
//
// Demo mode deliberately runs in its own page load: arriving from the
// landing page is a navigation, and leaving the demo navigates back to the
// normal app. That guarantees no React Query cache, Zustand store or in-
// memory fixture can be shared between a demo and a real session.
import { setupWorker } from 'msw/browser';
import { createRoot } from 'react-dom/client';
import { handlers } from '../mocks/handlers';
import { demoApiOrigins, realApiBlockers } from './block-real-api';
import { useDemoStore } from './demo-store';
import { DemoBanner } from './DemoBanner';

/**
 * Boot the in-browser mock API and the demo chrome. Awaited by main.tsx
 * before the first render so route guards see the seeded session.
 */
export async function startDemoMode(): Promise<void> {
  const origins = demoApiOrigins();
  const worker = setupWorker(...handlers, ...realApiBlockers);

  // The banner is part of the demo document, so mark the root for the CSS
  // that reserves room above it.
  document.documentElement.setAttribute('data-demo-mode', 'true');

  await worker.start({
    // GitHub Pages serves this app from /docforum-web/, so the worker has
    // to be requested from the build's base path, not the domain root.
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
    // Anything else unhandled (fonts, images) is a normal network request.
    onUnhandledRequest: (request, print) => {
      if (origins.some((origin) => request.url.startsWith(origin))) print.error();
    },
  });

  useDemoStore.getState().openPicker();

  const root = document.createElement('div');
  root.id = 'demo-banner-root';
  document.body.appendChild(root);
  createRoot(root).render(<DemoBanner />);
}
