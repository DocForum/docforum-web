import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render as rtlRender, screen, waitFor } from '@testing-library/react';
import { Flag } from './Flag';
import { RequireFlag } from './RequireFlag';
import { useFlag } from '../features/feature-flags/hooks/useFlags';
import * as myFlagsService from '../services/my-flags-service';
import { useAuthStore } from '../store/auth-store';

vi.mock('../services/my-flags-service');

function renderWithClient(ui: React.ReactNode, initialEntry = '/') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return rtlRender(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

function FlagProbe() {
  const enabled = useFlag('notification_preferences');
  return <output data-testid="flag-value">{enabled ? 'on' : 'off'}</output>;
}

describe('Flag and useFlag', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      accessToken: 'test-token',
      user: { id: 'u1', email: 'user@example.test', role: 'patient', createdAt: '', updatedAt: '' },
    });
  });

  it('does not flash gated content while flags are loading', async () => {
    let resolve!: (value: { flags: Record<string, boolean> }) => void;
    vi.mocked(myFlagsService.getMyFlags).mockReturnValue(
      new Promise((res) => {
        resolve = res;
      }),
    );

    renderWithClient(
      <Flag name="notification_preferences" loadingFallback={<p>Checking…</p>}>
        <p>Notifications screen</p>
      </Flag>,
    );

    expect(screen.getByText('Checking…')).toBeInTheDocument();
    expect(screen.queryByText('Notifications screen')).not.toBeInTheDocument();

    resolve({ flags: { notification_preferences: true } });
    expect(await screen.findByText('Notifications screen')).toBeInTheDocument();
  });

  it('renders the fallback and reports off when the flags request fails', async () => {
    vi.mocked(myFlagsService.getMyFlags).mockRejectedValue(new Error('flags unavailable'));

    renderWithClient(
      <>
        <Flag name="notification_preferences" fallback={<p>Not available</p>}>
          <p>Notifications screen</p>
        </Flag>
        <FlagProbe />
      </>,
    );

    expect(await screen.findByText('Not available', undefined, { timeout: 5_000 })).toBeInTheDocument();
    expect(screen.queryByText('Notifications screen')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('flag-value')).toHaveTextContent('off'));
  });

  it('RequireFlag redirects away from a gated route when the flag is off', async () => {
    vi.mocked(myFlagsService.getMyFlags).mockResolvedValue({
      flags: { notification_preferences: false },
    });

    renderWithClient(
      <Routes>
        <Route
          path="/settings/notifications"
          element={
            <RequireFlag name="notification_preferences">
              <p>Notifications screen</p>
            </RequireFlag>
          }
        />
        <Route path="/" element={<p>Home</p>} />
      </Routes>,
      '/settings/notifications',
    );

    expect(await screen.findByText('Home')).toBeInTheDocument();
    expect(screen.queryByText('Notifications screen')).not.toBeInTheDocument();
  });

  it('RequireFlag waits for flags and then renders the gated route', async () => {
    vi.mocked(myFlagsService.getMyFlags).mockResolvedValue({
      flags: { notification_preferences: true },
    });

    renderWithClient(
      <Routes>
        <Route
          path="/settings/notifications"
          element={
            <RequireFlag name="notification_preferences">
              <p>Notifications screen</p>
            </RequireFlag>
          }
        />
        <Route path="/" element={<p>Home</p>} />
      </Routes>,
      '/settings/notifications',
    );

    expect(await screen.findByText('Notifications screen')).toBeInTheDocument();
    expect(screen.queryByText('Home')).not.toBeInTheDocument();
  });
});
