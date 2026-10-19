import type { ReactElement, ReactNode } from 'react';
import { render as rtlRender } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
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
    </QueryClientProvider>
  );
}

export function render(ui: ReactElement) {
  return rtlRender(ui, { wrapper: AllProviders });
}

export * from '@testing-library/react';
