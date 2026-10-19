import type { ReactElement, ReactNode } from 'react';
import { render as rtlRender } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';

function AllProviders({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return (
    // Empty message catalogue: components carry English `defaultMessage`s,
    // exactly like the app does before a locale chunk resolves.
    <IntlProvider locale="en" defaultLocale="en" messages={{}} onError={() => undefined}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    </IntlProvider>
  );
}

export function render(ui: ReactElement) {
  return rtlRender(ui, { wrapper: AllProviders });
}

export * from '@testing-library/react';
