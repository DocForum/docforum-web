import type { Preview } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';
import '../src/styles/global.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const preview: Preview = {
  decorators: [
    (Story) => (
      <IntlProvider locale="en" defaultLocale="en" messages={{}} onError={() => undefined}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <Story />
          </MemoryRouter>
        </QueryClientProvider>
      </IntlProvider>
    ),
  ],
  parameters: {
    a11y: { test: 'error' },
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
  },
};

export default preview;
