import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { render, screen } from '../test/render';
import { LoginPage } from './LoginPage';
import * as authService from '../services/auth-service';
import { rememberReturnPath } from '../features/auth/return-path';
import { useAuthStore } from '../store/auth-store';
import { makeUser } from '../test/factories';
import type { Role, User } from '../types/models';

vi.mock('../services/auth-service', () => ({ login: vi.fn() }));

function renderAt(path: string) {
  render(<LoginPage />, { initialEntries: [path] });
}

function renderLoginFlow() {
  render(
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<div>Public home</div>} />
      <Route path="/patient" element={<div>Patient dashboard</div>} />
      <Route path="/doctor" element={<div>Doctor dashboard</div>} />
      <Route path="/facility" element={<div>Facility dashboard</div>} />
      <Route path="/admin" element={<div>Admin dashboard</div>} />
    </Routes>,
    { initialEntries: ['/login'] },
  );
}

async function signIn() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Email'), 'person@example.test');
  await user.type(screen.getByLabelText('Password'), 'password123');
  await user.click(screen.getByRole('button', { name: /^log in$/i }));
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.mocked(authService.login).mockReset();
  });

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

  it('returns the user to the page the route guard remembered (#226)', async () => {
    vi.mocked(authService.login).mockResolvedValue({
      user: {
        id: 'usr-1',
        email: 'pat@example.test',
        role: 'patient',
        createdAt: '2026-10-19T09:00:00.000Z',
        updatedAt: '2026-10-19T09:00:00.000Z',
      },
      accessToken: 'tok',
    });
    rememberReturnPath('http://localhost:5173/patient/orders/abc?tab=items');
    const user = userEvent.setup();

    render(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/patient/orders/abc" element={<div>Order detail</div>} />
      </Routes>,
      { initialEntries: ['/login'] },
    );

    await user.type(screen.getByLabelText(/email/i), 'pat@example.test');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(await screen.findByText('Order detail')).toBeInTheDocument();
  });

  it('ignores a remembered page the signed-in role cannot open (#226)', async () => {
    vi.mocked(authService.login).mockResolvedValue({
      user: {
        id: 'usr-2',
        email: 'doc@example.test',
        role: 'doctor',
        createdAt: '2026-10-19T09:00:00.000Z',
        updatedAt: '2026-10-19T09:00:00.000Z',
      },
      accessToken: 'tok',
    });
    rememberReturnPath('http://localhost:5173/patient/orders/abc');
    const user = userEvent.setup();

    render(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/doctor" element={<div>Doctor dashboard</div>} />
      </Routes>,
      { initialEntries: ['/login'] },
    );

    await user.type(screen.getByLabelText(/email/i), 'doc@example.test');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(await screen.findByText('Doctor dashboard')).toBeInTheDocument();
  });

  it.each([
    ['patient', 'Patient dashboard'],
    ['doctor', 'Doctor dashboard'],
    ['facility', 'Facility dashboard'],
    ['admin', 'Admin dashboard'],
  ] as const)('sends a signed-in %s to their dashboard', async (role, heading) => {
    vi.mocked(authService.login).mockResolvedValue({
      user: makeUser({ role }),
      accessToken: 'token',
    });

    renderLoginFlow();
    await signIn();

    expect(await screen.findByText(heading)).toBeInTheDocument();
  });

  it('falls back to the public home page for an unknown role', async () => {
    vi.mocked(authService.login).mockResolvedValue({
      user: makeUser({ role: 'auditor' as Role }),
      accessToken: 'token',
    });

    renderLoginFlow();
    await signIn();

    expect(await screen.findByText('Public home')).toBeInTheDocument();
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
