import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// HashRouter, not BrowserRouter: GitHub Pages has no server-side rewrite
// for client-side routes, so a deep link like /login would 404 on refresh
// under history-API routing. Hash-based routing needs no server config.
// Revisit if this ever deploys somewhere with a real rewrite rule.
import { HashRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './styles/global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

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
