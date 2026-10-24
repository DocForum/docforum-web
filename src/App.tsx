import { useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import type { createAppRouter } from './router';
import { createAppRouter as makeRouter } from './router';
import { queryClient } from './query-client';
import { Toaster } from './components/Toast';

interface AppProps {
  /** Injectable for tests; production uses the shared query client. */
  router?: ReturnType<typeof createAppRouter>;
}

export default function App({ router }: AppProps) {
  const [appRouter] = useState(() => router ?? makeRouter(queryClient));

  return (
    <>
      <RouterProvider router={appRouter} />
      <Toaster />
    </>
  );
}
