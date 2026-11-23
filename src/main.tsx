import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// HashRouter, not BrowserRouter: GitHub Pages has no server-side rewrite
// for client-side routes, so a deep link like /login would 404 on refresh
// under history-API routing. Hash-based routing needs no server config.
// Revisit if this ever deploys somewhere with a real rewrite rule.
import { HashRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './query-client';
import { useAuthStore } from './store/auth-store';
import App from './App';
import './styles/global.css';

const urlParams = new URLSearchParams(window.location.search);

// Async boot, not top-level await: the production target (es2020) doesn't
// support TLA, and both mock paths below have to finish before the first
// render so route guards see the seeded session on deep links.
async function boot(): Promise<void> {
  // Public demo mode (issue #127): `?demo=1` boots the whole app on the
  // in-browser mock API so the GitHub Pages preview can be explored without
  // waiting for the free-tier backend. The import is dynamic on purpose —
  // MSW, fixtures, handlers and the demo chrome become their own chunk that
  // a normal session never downloads (`npm run check:dist` enforces that
  // the main bundle stays free of mock code).
  const demoRequested = urlParams.get('demo') === '1' || urlParams.get('demo') === 'true';
  if (demoRequested) {
    const { startDemoMode } = await import('./demo/bootstrap');
    await startDemoMode();
  } else if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_MOCKS === 'true') {
    // Mock API for local development (issue #95) — only runs under
    // `npm run dev:mock` (a DEV build with VITE_ENABLE_MOCKS=true). In
    // production builds import.meta.env.DEV is statically false, so this
    // branch is dead code and is never emitted.
    const { startMockApi } = await import('./mocks/setup');
    startMockApi();
  }

  // Enable preview session when previewRole query param is set (useful for screenshots & review)
  const previewRole = urlParams.get('previewRole');
  if (
    !demoRequested &&
    previewRole &&
    (previewRole === 'doctor' ||
      previewRole === 'facility' ||
      previewRole === 'patient' ||
      previewRole === 'admin')
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

  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('#root element not found');

  createRoot(rootElement).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <HashRouter>
          <App />
        </HashRouter>
      </QueryClientProvider>
    </StrictMode>,
  );
}

void boot();
