import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../test/render';
import { InviteLanding } from './InviteLanding';
import { ApiError } from '../../../services/api-client';
import { useAuthStore } from '../../../store/auth-store';
import * as authService from '../../../services/auth-service';
import type { AccountInvite, User } from '../../../types/models';

vi.mock('../../../services/auth-service', () => ({
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

describe('InviteLanding', () => {
  beforeEach(() => {
    vi.mocked(authService.getInvite).mockReset();
    vi.mocked(authService.acceptInvite).mockReset();
    vi.mocked(authService.logout).mockResolvedValue(undefined);
  });

  afterEach(() => {
    useAuthStore.getState().clearSession();
  });

  it('shows who invited you and to what, with no role input anywhere', async () => {
    vi.mocked(authService.getInvite).mockResolvedValue(pendingInvite);

    render(<InviteLanding token="tok-1" />);

    expect(await screen.findByText('You’ve been invited')).toBeInTheDocument();
    expect(screen.getByText('Example Lab (fake)')).toBeInTheDocument();
    expect(screen.getByText('Facility staff')).toBeInTheDocument();
    expect(screen.getByText('Fiona Placeholder (fake)')).toBeInTheDocument();
    expect(screen.getAllByText('new.facility.staff@example.test').length).toBeGreaterThan(0);

    // The role is display-only — there is no way to pick or change it here.
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^role/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('shows a clear expired state', async () => {
    vi.mocked(authService.getInvite).mockResolvedValue({
      ...pendingInvite,
      status: 'expired',
    });

    render(<InviteLanding token="tok-expired" />);

    expect(await screen.findByText('Invitation expired')).toBeInTheDocument();
    expect(screen.getByText(/expired on /i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /accept/i })).not.toBeInTheDocument();
  });

  it('shows a clear revoked state', async () => {
    vi.mocked(authService.getInvite).mockResolvedValue({
      ...pendingInvite,
      status: 'revoked',
    });

    render(<InviteLanding token="tok-revoked" />);

    expect(await screen.findByText('Invitation revoked')).toBeInTheDocument();
    expect(screen.getByText(/was revoked/i)).toBeInTheDocument();
  });

  it('shows a clear already-used state for an accepted invite', async () => {
    vi.mocked(authService.getInvite).mockResolvedValue({
      ...pendingInvite,
      status: 'accepted',
    });

    render(<InviteLanding token="tok-used" />);

    expect(await screen.findByText('Invitation already used')).toBeInTheDocument();
    expect(screen.getByText(/already been used/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument();
  });

  it('treats a 404 as a not-found/already-used link', async () => {
    vi.mocked(authService.acceptInvite).mockRejectedValue(new ApiError('Not found', 404));
    vi.mocked(authService.getInvite).mockRejectedValue(new ApiError('Not found', 404));

    render(<InviteLanding token="tok-404" />);

    expect(await screen.findByText('Invitation not found')).toBeInTheDocument();
    expect(screen.getByText(/already been used/i)).toBeInTheDocument();
    expect(screen.queryByLabelText('Full name')).not.toBeInTheDocument();
  });

  it('creates the account with the invited email and never sends a role', async () => {
    vi.mocked(authService.getInvite).mockResolvedValue(pendingInvite);
    vi.mocked(authService.acceptInvite).mockResolvedValue({
      user: invitedUser,
      accessToken: 'access-token',
    });
    const user = userEvent.setup();

    render(<InviteLanding token="tok-1" />);

    await user.type(await screen.findByLabelText('Full name'), 'New Person (fake)');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    // Deep equality: if a `role` field ever crept into the payload, this
    // assertion fails — the role is docforum-core's to derive from the token.
    // The second argument is the (absent) bearer token: a brand-new
    // account has no session yet.
    await waitFor(() => {
      expect(authService.acceptInvite).toHaveBeenCalledWith(
        {
          token: 'tok-1',
          email: 'new.facility.staff@example.test',
          fullName: 'New Person (fake)',
          password: 'password123',
        },
        null,
      );
    });

    await waitFor(() => {
      expect(useAuthStore.getState().user?.role).toBe('facility');
    });
  });

  it('lets an existing signed-in user accept with one click', async () => {
    vi.mocked(authService.getInvite).mockResolvedValue(pendingInvite);
    vi.mocked(authService.acceptInvite).mockResolvedValue({
      user: invitedUser,
      accessToken: 'access-token',
    });
    useAuthStore.getState().setSession(invitedUser, 'access-token');
    const user = userEvent.setup();

    render(<InviteLanding token="tok-1" />);

    expect(await screen.findByRole('button', { name: /accept invitation/i })).toBeInTheDocument();
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /accept invitation/i }));

    await waitFor(() => {
      // The signed-in user's access token goes out as the bearer token —
      // still no role in the payload.
      expect(authService.acceptInvite).toHaveBeenCalledWith(
        { token: 'tok-1', email: 'new.facility.staff@example.test' },
        'access-token',
      );
    });
  });

  it('offers the log-in path for existing users who are signed out', async () => {
    vi.mocked(authService.getInvite).mockResolvedValue(pendingInvite);

    render(<InviteLanding token="tok-1" />);

    const loginLink = await screen.findByRole('link', {
      name: /log in to accept this invitation/i,
    });
    expect(loginLink).toHaveAttribute('href', '/login');
  });

  it('flags a signed-in session for a different email and offers sign out', async () => {
    vi.mocked(authService.getInvite).mockResolvedValue(pendingInvite);
    vi.mocked(authService.acceptInvite).mockResolvedValue({
      user: invitedUser,
      accessToken: 'access-token',
    });
    useAuthStore.getState().setSession(
      { ...invitedUser, email: 'wrong.person@example.test' },
      'access-token',
    );
    const user = userEvent.setup();

    render(<InviteLanding token="tok-1" />);

    expect(await screen.findByText(/you’re signed in as wrong.person@example.test/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /accept invitation/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /sign out/i }));

    await waitFor(() => {
      expect(authService.logout).toHaveBeenCalled();
    });
    // Signing out drops back into the create-account flow for the invited
    // address — the session can't accept an invite meant for someone else.
    expect(await screen.findByLabelText('Password')).toBeInTheDocument();
    expect(useAuthStore.getState().user).toBeNull();
  });
});
