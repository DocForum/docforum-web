import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderRoute } from './test/render';
import { useAuthStore } from './store/auth-store';
import * as authService from './services/auth-service';
import * as dependentsService from './services/dependents-service';
import type { AuthSession } from './services/auth-service';
import type { User } from './types/models';

vi.mock('./services/auth-service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./services/auth-service')>()),
  refresh: vi.fn(),
}));
vi.mock('./services/dependents-service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./services/dependents-service')>()),
  listDependents: vi.fn(),
}));

const patient: User = {
  id: 'user-1',
  email: 'patient@example.com',
  role: 'patient',
  createdAt: '',
  updatedAt: '',
};

const doctor: User = {
  ...patient,
  id: 'user-2',
  email: 'doctor@example.com',
  role: 'doctor',
};

function signIn(user: User) {
  useAuthStore.setState({ user, accessToken: 'token', isRestoring: false });
}

beforeEach(() => {
  vi.mocked(authService.refresh).mockReset();
  vi.mocked(dependentsService.listDependents).mockReset();
});

afterEach(() => {
  useAuthStore.getState().clearSession();
});

describe('data-router guards', () => {
  it('waits for the boot session restore before deciding', async () => {
    let resolveRefresh!: (session: AuthSession) => void;
    vi.mocked(authService.refresh).mockReturnValue(
      new Promise<AuthSession>((resolve) => {
        resolveRefresh = resolve;
      }),
    );

    renderRoute('/patient');

    // The guard is still awaiting the refresh, so it has not redirected.
    expect(screen.queryByText('Welcome back')).not.toBeInTheDocument();

    resolveRefresh({ user: patient, accessToken: 'restored-token' });

    expect(
      await screen.findByRole('heading', { name: 'What needs your attention' }),
    ).toBeInTheDocument();
    expect(useAuthStore.getState().accessToken).toBe('restored-token');
  });

  it('redirects signed-out deep links to the login screen', async () => {
    vi.mocked(authService.refresh).mockRejectedValue(new Error('no cookie'));
    renderRoute('/patient/dependents');

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/login');
  });

  it('renders a protected route for an allowed role', async () => {
    signIn(patient);
    renderRoute('/patient');

    expect(
      await screen.findByRole('heading', { name: 'What needs your attention' }),
    ).toBeInTheDocument();
  });

  it('redirects a signed-in user without the required role to their dashboard', async () => {
    signIn(doctor);
    renderRoute('/patient/dependents');

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/doctor'));
  });

  it('prefetches route data through the loader before the page renders', async () => {
    signIn(patient);
    vi.mocked(dependentsService.listDependents).mockResolvedValue([]);

    renderRoute('/patient/dependents');

    expect(await screen.findByRole('heading', { name: 'Dependents' })).toBeInTheDocument();
    expect(dependentsService.listDependents).toHaveBeenCalledTimes(1);
    expect(dependentsService.listDependents).toHaveBeenCalledWith('token');
  });
});
