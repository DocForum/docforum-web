import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '../test/render';
import { Layout } from './Layout';
import { useAuthStore } from '../store/auth-store';
import type { User } from '../types/models';

const facilityUser: User = {
  id: 'user-facility',
  email: 'owner@example.test',
  role: 'facility',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

afterEach(() => {
  useAuthStore.getState().clearSession();
});

describe('Layout header auth controls', () => {
  it('shows only sign-in and sign-up entries to a signed-out visitor', () => {
    render(<Layout />);

    expect(screen.queryByRole('button', { name: /log out/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /log in/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign up/i })).toBeInTheDocument();
  });

  it('shows the logout control and account details to a signed-in user', () => {
    useAuthStore.getState().setSession(facilityUser, 'facility-token');

    render(<Layout />);

    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
    expect(screen.getByText(facilityUser.email)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /log in/i })).not.toBeInTheDocument();
  });

  it('does not flash logout while a half-restored session settles', () => {
    // The boot refresh can restore the user before its access token lands.
    // Neither half alone should render account controls.
    useAuthStore.setState({ user: facilityUser, accessToken: null });

    render(<Layout />);

    expect(screen.queryByRole('button', { name: /log out/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /log in/i })).toBeInTheDocument();
  });
});
