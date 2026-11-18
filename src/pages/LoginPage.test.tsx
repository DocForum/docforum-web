import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '../test/render';
import { LoginPage } from './LoginPage';
import { useAuthStore } from '../store/auth-store';
import type { User } from '../types/models';

function renderAt(path: string) {
  render(<LoginPage />, { initialEntries: [path] });
}

describe('LoginPage', () => {
  afterEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, signOutReason: null });
  });

  it('explains an idle-timeout sign-out', () => {
    renderAt('/login?reason=idle-timeout');
    expect(screen.getByText(/signed out automatically/i)).toBeInTheDocument();
  });

  it('shows no idle notice on a normal visit', () => {
    renderAt('/login');
    expect(screen.queryByText(/signed out automatically/i)).not.toBeInTheDocument();
  });

  it('falls back to the in-memory reason when a redirect stripped the query param', () => {
    // A route guard can win the navigation race on timeout sign-out and
    // land on plain /login — the notice must still appear.
    useAuthStore.getState().signOutDueToIdle();
    renderAt('/login');
    expect(screen.getByText(/signed out automatically/i)).toBeInTheDocument();
  });

  it('signing back in clears the idle sign-out reason', () => {
    useAuthStore.getState().signOutDueToIdle();
    const user: User = {
      id: 'usr-1',
      email: 'pat@example.test',
      role: 'patient',
      createdAt: '2026-10-19T09:00:00.000Z',
      updatedAt: '2026-10-19T09:00:00.000Z',
    };
    useAuthStore.getState().setSession(user, 'tok');
    expect(useAuthStore.getState().signOutReason).toBeNull();
  });
});
