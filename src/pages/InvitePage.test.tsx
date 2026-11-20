// Page-level tests for the invite route (issue #81): the token is read
// once and stripped from the URL, and a tampered `?role=` query can't
// influence what role is shown or granted — it always comes from
// docforum-core's invite response.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render as rtlRender, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { I18nProvider } from '../i18n/I18nProvider';
import { InvitePage } from './InvitePage';
import { LoginPage } from './LoginPage';
import { useAuthStore } from '../store/auth-store';
import * as authService from '../services/auth-service';
import type { AccountInvite, User } from '../types/models';

vi.mock('../services/auth-service', () => ({
  getInvite: vi.fn(),
  acceptInvite: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
}));

const pendingInvite: AccountInvite = {
  id: 'inv-test-1',
  email: 'new.facility.staff@example.test',
  role: 'facility',
  organisationName: 'Example Lab (fake)',
  organisationType: 'lab',
  invitedBy: 'Fiona Placeholder (fake)',
  status: 'pending',
  invitedAt: '2026-10-17T09:00:00.000Z',
  expiresAt: '2026-10-31T09:00:00.000Z',
};

const invitedUser: User = {
  id: 'usr-invited',
  email: pendingInvite.email,
  role: 'facility',
  createdAt: '2026-10-19T09:00:00.000Z',
  updatedAt: '2026-10-19T09:00:00.000Z',
};

function LocationProbe() {
  const location = useLocation();
  return (
    <div data-testid="location">
      {location.pathname}
      {location.search}
    </div>
  );
}

function renderPage(path: string): void {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  rtlRender(
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[path]}>
          <LocationProbe />
          <Routes>
            <Route path="/invite" element={<InvitePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/facility" element={<div>Facility dashboard</div>} />
            <Route path="/admin" element={<div>Admin dashboard</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </I18nProvider>,
  );
}

describe('InvitePage', () => {
  beforeEach(() => {
    vi.mocked(authService.getInvite).mockReset();
    vi.mocked(authService.acceptInvite).mockReset();
    vi.mocked(authService.login).mockReset();
    vi.mocked(authService.logout).mockResolvedValue(undefined);
  });

  afterEach(() => {
    useAuthStore.getState().clearSession();
  });

  it('reads the token from the URL, then strips it (including a tampered role param)', async () => {
    vi.mocked(authService.getInvite).mockResolvedValue(pendingInvite);

    renderPage('/invite?token=secret-token&role=admin');

    expect(await screen.findByText('Example Lab (fake)')).toBeInTheDocument();
    expect(authService.getInvite).toHaveBeenCalledWith('secret-token');

    // The credential (and the tampered param) never linger in the URL.
    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/invite');
    });
  });

  it('takes the role from the invite, never from the URL', async () => {
    vi.mocked(authService.getInvite).mockResolvedValue(pendingInvite);
    vi.mocked(authService.acceptInvite).mockResolvedValue({
      user: invitedUser,
      accessToken: 'access-token',
    });
    const user = userEvent.setup();

    // Attacker appends role=admin to the invite link…
    renderPage('/invite?token=secret-token&role=admin');

    // …the page still shows the role docforum-core returned for the token.
    expect(await screen.findByText('Facility staff')).toBeInTheDocument();
    expect(screen.queryByText('Administrator')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Full name'), 'New Person (fake)');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    // …and the accept payload carries no role field at all.
    await waitFor(() => {
      expect(authService.acceptInvite).toHaveBeenCalledWith(
        {
          token: 'secret-token',
          email: 'new.facility.staff@example.test',
          fullName: 'New Person (fake)',
          password: 'password123',
        },
        null,
      );
    });

    expect(await screen.findByText('Facility dashboard')).toBeInTheDocument();
    expect(useAuthStore.getState().user?.role).toBe('facility');
  });

  it('sends an existing user through login and back to the invite', async () => {
    vi.mocked(authService.getInvite).mockResolvedValue(pendingInvite);
    vi.mocked(authService.login).mockResolvedValue({
      user: invitedUser,
      accessToken: 'access-token',
    });
    vi.mocked(authService.acceptInvite).mockResolvedValue({
      user: invitedUser,
      accessToken: 'access-token',
    });
    const user = userEvent.setup();

    renderPage('/invite?token=secret-token');

    await user.click(
      await screen.findByRole('link', { name: /log in to accept this invitation/i }),
    );
    expect(screen.getByTestId('location').textContent).toBe('/login');

    await user.type(screen.getByLabelText('Email'), 'new.facility.staff@example.test');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: /^log in$/i }));

    // Back on the invite — the token travelled in router state only, and
    // the signed-in user can now accept without re-entering credentials.
    expect(await screen.findByRole('button', { name: /accept invitation/i })).toBeInTheDocument();
    expect(screen.getByTestId('location').textContent).toBe('/invite');

    await user.click(screen.getByRole('button', { name: /accept invitation/i }));
    expect(await screen.findByText('Facility dashboard')).toBeInTheDocument();
  });

  it('shows an invalid-link state when the token is missing', () => {
    renderPage('/invite');
    expect(screen.getByText('Invalid link')).toBeInTheDocument();
    expect(authService.getInvite).not.toHaveBeenCalled();
  });
});
