// Controller tests (issue #82): backend settings take precedence over the
// role defaults, the warning surfaces, and the timeout sequence clears
// every piece of client state before landing on /login with the reason.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { SessionTimeoutController } from './SessionTimeoutController';
import { useIdleTimeout } from '../hooks/useIdleTimeout';
import { IDLE_TIMEOUT_DEFAULTS } from '../hooks/idle-timeout';
import * as sessionTimeoutService from '../services/session-timeout-service';
import * as authService from '../services/auth-service';
import { ApiError } from '../services/api-client';
import { useAuthStore } from '../store/auth-store';
import { useProfileStore } from '../store/profile-store';
import { useUnsavedChangesStore } from '../store/unsaved-changes-store';
import type { ActingProfile, User } from '../types/models';

vi.mock('../hooks/useIdleTimeout', () => ({ useIdleTimeout: vi.fn() }));
vi.mock('../services/session-timeout-service', () => ({ getSessionTimeoutSettings: vi.fn() }));
vi.mock('../services/auth-service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/auth-service')>();
  return { ...actual, logout: vi.fn().mockResolvedValue(undefined) };
});

const doctor: User = {
  id: 'usr-doctor-1',
  email: 'demo.doctor@example.test',
  role: 'doctor',
  createdAt: '2026-10-19T09:00:00.000Z',
  updatedAt: '2026-10-19T09:00:00.000Z',
};

type IdleReturn = ReturnType<typeof useIdleTimeout>;

function idleResult(overrides: Partial<IdleReturn> = {}): IdleReturn {
  return {
    phase: 'active',
    warningVisible: false,
    secondsRemaining: 600,
    extendSession: vi.fn(),
    ...overrides,
  };
}

function Probe() {
  const location = useLocation();
  return (
    <div data-testid="location">
      {location.pathname}
      {location.search}
    </div>
  );
}

function renderController() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/']}>
        <Probe />
        <Routes>
          <Route path="/" element={<SessionTimeoutController />} />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return queryClient;
}

describe('SessionTimeoutController', () => {
  const idleMock = vi.mocked(useIdleTimeout);

  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null });
    useProfileStore.setState({ profiles: [], selectedProfileId: null });
    useUnsavedChangesStore.getState().reset();
    idleMock.mockReset();
    idleMock.mockReturnValue(idleResult());
  });

  afterEach(() => {
    vi.mocked(authService.logout).mockClear();
    vi.mocked(sessionTimeoutService.getSessionTimeoutSettings).mockReset();
  });

  it('renders nothing and fetches nothing while signed out', () => {
    renderController();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(sessionTimeoutService.getSessionTimeoutSettings).not.toHaveBeenCalled();
  });

  it("uses the backend's settings when it serves valid ones", async () => {
    vi.mocked(sessionTimeoutService.getSessionTimeoutSettings).mockResolvedValue({
      idleTimeoutMinutes: 5,
      warningSeconds: 30,
    });
    useAuthStore.setState({ user: doctor, accessToken: 'tok' });

    renderController();

    await waitFor(() => {
      expect(idleMock).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: true,
          settings: { idleTimeoutMinutes: 5, warningSeconds: 30 },
        }),
      );
    });
  });

  it('falls back to the role defaults when the backend has nothing sane to offer', async () => {
    // 404 today (endpoint not implemented in docforum-core)…
    vi.mocked(sessionTimeoutService.getSessionTimeoutSettings).mockRejectedValue(
      new ApiError('Not found', 404),
    );
    useAuthStore.setState({ user: doctor, accessToken: 'tok' });

    renderController();

    await waitFor(() => {
      expect(idleMock).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: true, settings: IDLE_TIMEOUT_DEFAULTS.doctor }),
      );
    });

    // …and a malformed backend value also loses to the defaults.
    idleMock.mockClear();
    vi.mocked(sessionTimeoutService.getSessionTimeoutSettings).mockResolvedValue({
      idleTimeoutMinutes: -3,
    } as never);

    renderController();

    await waitFor(() => {
      expect(idleMock).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: true, settings: IDLE_TIMEOUT_DEFAULTS.doctor }),
      );
    });
  });

  it('surfaces the warning while the hook reports the warning phase', async () => {
    vi.mocked(sessionTimeoutService.getSessionTimeoutSettings).mockResolvedValue({
      idleTimeoutMinutes: 15,
      warningSeconds: 60,
    });
    const extendSession = vi.fn();
    idleMock.mockReturnValue(
      idleResult({ phase: 'warning', warningVisible: true, secondsRemaining: 42, extendSession }),
    );
    useAuthStore.setState({ user: doctor, accessToken: 'tok' });

    renderController();

    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText(/42 seconds/)).toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole('button', { name: /stay signed in/i }));
    expect(extendSession).toHaveBeenCalledTimes(1);
  });

  it('performs the full sign-out sequence on timeout', async () => {
    vi.mocked(sessionTimeoutService.getSessionTimeoutSettings).mockResolvedValue({
      idleTimeoutMinutes: 15,
      warningSeconds: 60,
    });
    useAuthStore.setState({ user: doctor, accessToken: 'tok' });
    const profile: ActingProfile = { id: 'prf-1', fullName: 'Demo Doctor', isSelf: true };
    useProfileStore.setState({ profiles: [profile], selectedProfileId: 'prf-1' });
    useUnsavedChangesStore.setState({ count: 2 });

    const queryClient = renderController();
    queryClient.setQueryData(['warm-cache'], { secret: 'patient-data' });

    const options = idleMock.mock.calls.at(-1)![0];
    await act(async () => {
      await options.onTimeout();
    });

    // API logout first (server-side session invalidated)…
    expect(authService.logout).toHaveBeenCalledWith('tok');
    // …then ALL client state is gone…
    expect(queryClient.getQueryData(['warm-cache'])).toBeUndefined();
    expect(useProfileStore.getState().profiles).toHaveLength(0);
    expect(useProfileStore.getState().selectedProfileId).toBeNull();
    expect(useUnsavedChangesStore.getState().count).toBe(0);
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().signOutReason).toBe('idle-timeout');
    // …and the user lands on login with the reason.
    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/login?reason=idle-timeout');
    });
  });

  it('still signs out client-side when the API logout fails', async () => {
    vi.mocked(sessionTimeoutService.getSessionTimeoutSettings).mockResolvedValue({
      idleTimeoutMinutes: 15,
      warningSeconds: 60,
    });
    vi.mocked(authService.logout).mockRejectedValueOnce(new Error('network down'));
    useAuthStore.setState({ user: doctor, accessToken: 'tok' });

    renderController();
    const options = idleMock.mock.calls.at(-1)![0];
    await act(async () => {
      await options.onTimeout();
    });

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().signOutReason).toBe('idle-timeout');
    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/login?reason=idle-timeout');
    });
  });
});
