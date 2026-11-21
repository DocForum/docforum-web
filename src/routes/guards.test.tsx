// Replaces RequireAuth.test.tsx (issue #112): the same five behaviours, now
// asserted against the loader guard + RoleGate inside a data router.
import { describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, type LoaderFunctionArgs, type RouteObject } from 'react-router-dom';
import { takeReturnPath } from '../features/auth/return-path';
import { useAuthStore } from '../store/auth-store';
import type { User } from '../types/models';
import { guardDecision, requireRoles, waitForSessionRestore } from './guards';
import { guardedSection } from './route-helpers';

const patient: User = {
  id: 'user-1',
  email: 'patient@example.com',
  role: 'patient',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function renderGuarded(initialPath: string, prefetch = vi.fn()) {
  const routes: RouteObject[] = [
    { path: '/login', element: <div>Login page</div> },
    { path: '/', element: <div>Home page</div> },
    guardedSection('patient', ['patient'], [
      { path: '/patient', element: <div>Patient dashboard</div>, prefetch },
    ]),
  ];
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] });
  render(<RouterProvider router={router} />);
  return { router, prefetch };
}

describe('route guards (loader-based)', () => {
  it('redirects to /login when no user is signed in', async () => {
    const { router, prefetch } = renderGuarded('/patient');
    expect(await screen.findByText('Login page')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
    expect(prefetch).not.toHaveBeenCalled();
  });

  it('remembers the attempted page so sign-in can return there (#226)', async () => {
    renderGuarded('/patient?tab=items');
    expect(await screen.findByText('Login page')).toBeInTheDocument();
    expect(takeReturnPath()).toBe('/patient?tab=items');
  });

  it('waits for the boot refresh instead of redirecting to /login', async () => {
    act(() => useAuthStore.setState({ status: 'resolving' }));
    renderGuarded('/patient');

    expect(await screen.findByText(/restoring your session/i)).toBeInTheDocument();
    expect(screen.queryByText('Login page')).not.toBeInTheDocument();
  });

  it('shows the protected route once the boot refresh signs the user in', async () => {
    act(() => useAuthStore.setState({ status: 'resolving' }));
    const { prefetch } = renderGuarded('/patient');
    expect(await screen.findByText(/restoring your session/i)).toBeInTheDocument();

    act(() => {
      useAuthStore.getState().setSession(patient, 'token', 'csrf-token');
    });

    expect(await screen.findByText('Patient dashboard')).toBeInTheDocument();
    expect(prefetch).toHaveBeenCalledWith(expect.objectContaining({ params: {} }), 'token');
  });

  it('redirects to /login when the boot refresh finds no session', async () => {
    act(() => useAuthStore.setState({ status: 'resolving' }));
    renderGuarded('/patient');
    expect(await screen.findByText(/restoring your session/i)).toBeInTheDocument();

    act(() => useAuthStore.getState().endAuthCheck());

    expect(await screen.findByText('Login page')).toBeInTheDocument();
  });

  it('renders the protected content for an allowed role', async () => {
    useAuthStore.getState().setSession(patient, 'token');
    renderGuarded('/patient');
    expect(await screen.findByText('Patient dashboard')).toBeInTheDocument();
  });

  it('redirects home when the signed-in role is not allowed, without prefetching', async () => {
    useAuthStore.getState().setSession({ ...patient, role: 'doctor' }, 'token');
    const { prefetch } = renderGuarded('/patient');
    expect(await screen.findByText('Home page')).toBeInTheDocument();
    expect(prefetch).not.toHaveBeenCalled();
  });

  it('redirects an open guarded page when the session ends (another tab, idle timeout)', async () => {
    useAuthStore.getState().setSession(patient, 'token');
    const { router } = renderGuarded('/patient');
    expect(await screen.findByText('Patient dashboard')).toBeInTheDocument();

    act(() => useAuthStore.getState().clearSession());

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
  });

  it('does not keep the guarded URL in history after a redirect', async () => {
    const { router } = renderGuarded('/patient');
    await screen.findByText('Login page');
    expect(router.state.historyAction).toBe('REPLACE');
  });
});

describe('waitForSessionRestore', () => {
  it('resolves immediately when no restore is in flight', async () => {
    await expect(waitForSessionRestore()).resolves.toBeUndefined();
  });

  it('resolves once the restore finishes', async () => {
    useAuthStore.setState({ status: 'resolving' });
    let done = false;
    const waiting = waitForSessionRestore().then(() => {
      done = true;
    });
    await Promise.resolve();
    expect(done).toBe(false);
    useAuthStore.getState().endAuthCheck();
    await waiting;
    expect(done).toBe(true);
  });
});

describe('guardDecision / requireRoles', () => {
  it('mirrors RequireAuth: /login signed out, / for the wrong role, allow otherwise', () => {
    expect(guardDecision(['patient'])).toBe('/login');
    useAuthStore.getState().setSession(patient, 'token');
    expect(guardDecision(['patient'])).toBe('allow');
    expect(guardDecision(['admin'])).toBe('/');
  });

  it('throws a redirect Response the router follows', async () => {
    const loader = requireRoles(['admin']);
    const args = { request: new Request('http://x/admin'), params: {}, context: undefined } as unknown as LoaderFunctionArgs;
    const result = await loader(args).catch(
      (thrown: unknown) => thrown,
    );
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).headers.get('Location')).toBe('/login');
  });
});
