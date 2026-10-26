import type { ReactElement, ReactNode } from 'react';
import { render as rtlRender } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';
import { TimeZoneProvider } from '../i18n/TimeZoneProvider';

/** Same defaults the app gets in tests (no retries — a rejected mock should
 * surface immediately, not after three escalating waits). Exported so a test
 * that needs to inspect the cache (e.g. "the appointment is still there after
 * a 409") can build its own and pass it in. */
export function createQueryClient(): QueryClient {
  return new QueryClient({
function AllProviders({ children, initialEntries }: { children: ReactNode; initialEntries?: string[] }) {
  const queryClient = new QueryClient({
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
      <TimeZoneProvider>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </TimeZoneProvider>
    </QueryClientProvider>
  );
}

export function render(ui: ReactElement, { queryClient = createQueryClient(), route = '/' }: RenderOptions = {}) {
  return rtlRender(ui, { wrapper: (props) => <AllProviders {...props} queryClient={queryClient} route={route} /> });
    // Empty message catalogue: components carry English `defaultMessage`s,
    // exactly like the app does before a locale chunk resolves.
    <IntlProvider locale="en" defaultLocale="en" messages={{}} onError={() => undefined}>
      <QueryClientProvider client={queryClient}>
        <TimeZoneProvider>
          <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
        </TimeZoneProvider>
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

export * from '@testing-library/react';
