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

// Mock API for local development (issue #95) — only runs under
// `npm run dev:mock` (a DEV build with VITE_ENABLE_MOCKS=true). In
// production builds import.meta.env.DEV is statically false, so this
// branch is dead code and the mocks chunk is never emitted — CI enforces
// that with `npm run check:dist` (scripts/check-dist-no-mocks.mjs).
// Awaited before the first render so the persona session exists when
// route guards first evaluate (deep links would otherwise bounce to the
// login screen mid-boot).
if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_MOCKS === 'true') {
  const { startMockApi } = await import('./mocks/setup');
  startMockApi();
}

// Enable preview session when previewRole query param is set (useful for screenshots & review)
const urlParams = new URLSearchParams(window.location.search);
const previewRole = urlParams.get('previewRole');
if (previewRole && (previewRole === 'doctor' || previewRole === 'facility' || previewRole === 'patient' || previewRole === 'admin')) {
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
