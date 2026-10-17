import type { ReactElement, ReactNode } from 'react';
import { render as rtlRender } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

/** Same defaults the app gets in tests (no retries — a rejected mock should
 * surface immediately, not after three escalating waits). Exported so a test
 * that needs to inspect the cache (e.g. "the appointment is still there after
 * a 409") can build its own and pass it in. */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

export interface RenderOptions {
  queryClient?: QueryClient;
  /** Initial history entry, for anything reading `useParams`/`useNavigate`. */
  route?: string;
}

function AllProviders({ children, queryClient, route }: { children: ReactNode } & Required<RenderOptions>) {
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

export function render(ui: ReactElement, { queryClient = createQueryClient(), route = '/' }: RenderOptions = {}) {
  return rtlRender(ui, { wrapper: (props) => <AllProviders {...props} queryClient={queryClient} route={route} /> });
}

export * from '@testing-library/react';
