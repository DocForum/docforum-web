import { useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import type { createAppRouter } from './router';
import { createAppRouter as makeRouter } from './router';
import { queryClient } from './query-client';
import { ErrorBoundary } from './components/ErrorBoundary';
import { I18nProvider } from './i18n/I18nProvider';
import { Toaster } from './components/Toast';
import { UpdatePromptContainer } from './pwa/UpdatePromptContainer';

interface AppProps {
  /** Injectable for tests; production uses the shared query client. */
  router?: ReturnType<typeof createAppRouter>;
}

/**
 * The data router owns history, page-view analytics and the hash-redirect
 * shim (see `AppLayout` in router.tsx), so this shell only supplies the
 * non-route providers and overlays.
 */
export default function App({ router }: AppProps) {
  const [appRouter] = useState(() => router ?? makeRouter(queryClient));

  return (
    <I18nProvider>
      <ErrorBoundary level="app">
        <RouterProvider router={appRouter} />
        <UpdatePromptContainer />
        <Toaster />
      </ErrorBoundary>
    </I18nProvider>
  );
}
