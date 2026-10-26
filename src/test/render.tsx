import type { ReactElement, ReactNode } from 'react';
import { useSyncExternalStore } from 'react';
import { render as rtlRender } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IntlProvider } from 'react-intl';
import { MemoryRouter, RouterProvider } from 'react-router-dom';
import { Toaster } from '../components/Toast';
import { TimeZoneProvider } from '../i18n/TimeZoneProvider';
import { createMemoryAppRouter } from '../router';

function AllProviders({ children, initialEntries }: { children: ReactNode; initialEntries?: string[] }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return (
    // Empty message catalogue: components carry English `defaultMessage`s,
    // exactly like the app does before a locale chunk resolves.
    <IntlProvider locale="en" defaultLocale="en" messages={{}} onError={() => undefined}>
      <QueryClientProvider client={queryClient}>
        <TimeZoneProvider>
          <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
        </TimeZoneProvider>
        <Toaster />
      </QueryClientProvider>
    </IntlProvider>
  );
}

export function render(ui: ReactElement, options?: { initialEntries?: string[] }) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AllProviders initialEntries={options?.initialEntries}>{children}</AllProviders>
  );
  return rtlRender(ui, { wrapper });
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
    // The route tree renders translated components, so it needs the same
    // IntlProvider the app mounts.
    <IntlProvider locale="en" defaultLocale="en" messages={{}} onError={() => undefined}>
      <QueryClientProvider client={queryClient}>
        <TimeZoneProvider>
          <RouterProvider router={router} />
        </TimeZoneProvider>
        <RouterLocationProbe router={router} />
        <Toaster />
      </QueryClientProvider>
    </IntlProvider>,
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
