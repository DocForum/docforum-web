import type { ReactElement, ReactNode } from 'react';
import { render as rtlRender } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';
import { TimeZoneProvider } from '../i18n/TimeZoneProvider';

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
