import type { ReactElement, ReactNode } from 'react';
import { useSyncExternalStore } from 'react';
import { render as rtlRender } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, RouterProvider } from 'react-router-dom';
import { Toaster } from '../components/Toast';
import { createMemoryAppRouter } from '../router';
import { TimeZoneProvider } from '../i18n/TimeZoneProvider';

function AllProviders({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <TimeZoneProvider>
        <MemoryRouter>{children}</MemoryRouter>
      </TimeZoneProvider>
      <Toaster />
    </QueryClientProvider>
  );
}

export function render(ui: ReactElement) {
  return rtlRender(ui, { wrapper: AllProviders });
}

/** Renders the real route tree with memory history. The query client is
 * shared by the router's loaders and the components, so prefetched data is
 * visible on the first render. */
export function renderRoute(path: string, existingClient?: QueryClient) {
  const queryClient =
    existingClient ??
    new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity },
        mutations: { retry: false },
      },
    });
  const router = createMemoryAppRouter(queryClient, [path]);

  const result = rtlRender(
    <QueryClientProvider client={queryClient}>
      <TimeZoneProvider>
        <RouterProvider router={router} />
      </TimeZoneProvider>
      <RouterLocationProbe router={router} />
      <Toaster />
    </QueryClientProvider>,
  );

  return { ...result, router, queryClient };
}

interface ProbeProps {
  router: ReturnType<typeof createMemoryAppRouter>;
}

function RouterLocationProbe({ router }: ProbeProps) {
  const location = useSyncExternalStore(
    (listener) => router.subscribe(listener),
    () => router.state.location,
  );
  return <output data-testid="location">{location.pathname + location.search}</output>;
}

export * from '@testing-library/react';
