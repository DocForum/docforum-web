import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { init } from '@sentry/react';
import { phiScrubber, phiBeforeBreadcrumb } from './utils/phi-scrubber';
// Router selection: BrowserRouter by default; HashRouter only when
// VITE_USE_HASH_ROUTER=true (set by the GitHub Pages build — see
// docs/adr/0001-routing-strategy.md and deploy-pages.yml).
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './query-client';
import { TimeZoneProvider } from './i18n/TimeZoneProvider';
import { useAuthStore } from './store/auth-store';
import { bootstrapSession } from './services/session';
import App from './App';
import './styles/global.css';

const useHashRouter = import.meta.env.VITE_USE_HASH_ROUTER === 'true';
const Router = useHashRouter ? HashRouter : BrowserRouter;

// Mock API for local development (issue #95) — only runs under
// `npm run dev:mock` (a DEV build with VITE_ENABLE_MOCKS=true). In
// production builds import.meta.env.DEV is statically false, so this
// branch is dead code and the mocks chunk is never emitted — CI enforces
// that with `npm run check:dist` (scripts/check-dist-no-mocks.mjs).
// Awaited before the first render so the persona session exists when
// route guards first evaluate (deep links would otherwise bounce to the
// login screen mid-boot).
// PR preview builds (#104) are production builds uploaded as a downloadable
// artifact, so `import.meta.env.DEV` is false there. They opt in explicitly
// with VITE_PREVIEW_MOCKS; the preview workflow sets that flag and nothing
// else, so a normal `npm run build` still cannot contain mock code (CI checks
// that with `npm run check:dist`). A preview must never talk to a real
// backend: it is built with a reserved-invalid API base URL and every request
// is answered by MSW. See .github/workflows/pr-preview-build.yml.
const mocksEnabled = import.meta.env.DEV
  ? import.meta.env.VITE_ENABLE_MOCKS === 'true'
  : import.meta.env.VITE_PREVIEW_MOCKS === 'true';

// Boot is async (but not a top-level await): a preview/production build
// targets browsers without top-level await support, so the dynamic import
// lives inside an async function. The first render still waits for the mock
// API, so the persona session exists when route guards evaluate.
async function boot(): Promise<void> {
  if (mocksEnabled) {
    const { startMockApi } = await import('./mocks/setup');
    await startMockApi();
  }

  // Enable preview session when previewRole query param is set (useful for screenshots & review)
  const urlParams = new URLSearchParams(window.location.search);
  const previewRole = urlParams.get('previewRole');
  if (
    previewRole &&
    (previewRole === 'doctor' || previewRole === 'facility' || previewRole === 'patient' || previewRole === 'admin')
  ) {
    useAuthStore.getState().setSession(
      {
        id: `preview-${previewRole}-user`,
        email: `${previewRole}@docforum.org`,
        role: previewRole,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      'preview-token',
    );
  }

  // Error monitoring: disabled unless a DSN is configured (VITE_SENTRY_DSN).
  // The Pages preview ships without one, so monitoring is off by default.
  // Session replay is deliberately never integrated. All events pass through
  // phiScrubber before leaving the browser — see src/utils/phi-scrubber.ts.
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
  if (sentryDsn) {
    init({
      dsn: sentryDsn,
      beforeSend: phiScrubber,
      beforeBreadcrumb: phiBeforeBreadcrumb,
      // Error monitoring only — no performance tracing.
      tracesSampleRate: 0,
    });
  }

  // Silent re-auth on reload (issue #9). Deliberately NOT awaited before
  // render: a cold-started Render instance can take ~40s, and RequireAuth
  // shows a "Restoring your session…" state while this is in flight. If a
  // session already exists (mock mode / ?previewRole=), this resolves
  // immediately without a network call.
  void bootstrapSession();

  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('#root element not found');

  createRoot(rootElement).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <Router>
          <TimeZoneProvider>
            <App />
          </TimeZoneProvider>
        </Router>
      </QueryClientProvider>
    </StrictMode>,
  );
}

void boot();
