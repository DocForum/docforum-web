// MSW service worker for browser mock mode. Only ever loaded from
// src/mocks/setup.ts, which itself is only dynamically imported by
// main.tsx when running `npm run dev:mock` (DEV build + VITE_ENABLE_MOCKS).
// Production builds eliminate that import entirely — verified in CI by
// `npm run check:dist` (scripts/check-dist-no-mocks.mjs).
import { http, HttpResponse, passthrough } from 'msw';
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/** Same default as `src/services/api-client.ts`. */
const API_ORIGIN = new URL(import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000').origin;

/**
 * Never mock the app's own code. Routes are lazy chunks (issue #112), so page
 * modules are fetched *after* the worker starts, and the API handlers use a
 * `*` origin wildcard: `*\/orders/:orderId` would otherwise answer the Vite dev
 * server's `/src/features/orders/current-orders.ts` with a mock 404 and break
 * the route's dynamic import. Same-origin source/dep/asset requests always go
 * to the network.
 */
const APP_CODE_PATH = /^\/(?:src|node_modules|assets|@vite|@id|@fs|@react-refresh)\//;

export const appCodePassthrough = http.all(
  ({ request }) => {
    const url = new URL(request.url);
    return url.origin === self.location.origin && APP_CODE_PATH.test(url.pathname);
  },
  () => passthrough(),
);

/**
 * An API endpoint with no mock handler answers 404, as a real backend would
 * for a route it doesn't have. Letting it through instead sends it to a
 * server that doesn't exist (localhost:4000, or the preview's reserved
 * `.invalid` origin): the network error flags the whole API as unreachable
 * and puts the "server is waking up" banner on otherwise healthy screens.
 * Registered last, so it only catches what no handler above matched.
 */
export const unmockedApiNotFound = http.all(
  ({ request }) => new URL(request.url).origin === API_ORIGIN,
  ({ request }) =>
    HttpResponse.json(
      { message: `Mock API: no mock for ${request.method} ${new URL(request.url).pathname}` },
      { status: 404 },
    ),
);

export const worker = setupWorker(appCodePassthrough, ...handlers, unmockedApiNotFound);
