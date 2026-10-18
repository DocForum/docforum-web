import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// HashRouter, not BrowserRouter: GitHub Pages has no server-side rewrite
// for client-side routes, so a deep link like /login would 404 on refresh
// under history-API routing. Hash-based routing needs no server config.
// Revisit if this ever deploys somewhere with a real rewrite rule.
import { HashRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { useAuthStore } from './store/auth-store';
import App from './App';
import './styles/global.css';

// Feed the browser's connectivity into React Query so queries pause while
// offline and refetch on reconnect. (Poor-network resilience, issue #85.)
onlineManager.setEventListener((setOnline) => {
  const handleOnline = () => setOnline(true);
  const handleOffline = () => setOnline(false);
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
});
onlineManager.setOnline(typeof navigator === 'undefined' || navigator.onLine !== false);

// Retries live in `apiFetch` (backoff, offline-aware, and only for
// mutations that carry an Idempotency-Key). React Query must not retry on
// its own or a mutation could be replayed without a key.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      networkMode: 'online',
    },
    mutations: {
      retry: false,
      networkMode: 'online',
    },
  },
});

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
