import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { act, render, screen } from '@testing-library/react';
import { RequireAuth } from './RequireAuth';
import { useAuthStore } from '../store/auth-store';
import type { User } from '../types/models';

const patient: User = {
  id: 'user-1',
  email: 'patient@example.com',
  role: 'patient',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function renderGuarded(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div>Login page</div>} />
        <Route path="/" element={<div>Home page</div>} />
        <Route
          path="/patient"
          element={
            <RequireAuth allowedRoles={['patient']}>
              <div>Patient dashboard</div>
            </RequireAuth>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireAuth', () => {
  afterEach(() => {
    act(() => useAuthStore.getState().clearSession());
  });

  it('redirects to /login when no user is signed in', () => {
    renderGuarded('/patient');
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('waits for the boot refresh instead of redirecting to /login', () => {
    act(() => useAuthStore.setState({ status: 'resolving' }));
    renderGuarded('/patient');

    expect(screen.getByText(/restoring your session/i)).toBeInTheDocument();
    expect(screen.queryByText('Login page')).not.toBeInTheDocument();
  });

  it('shows the protected route once the boot refresh signs the user in', () => {
    act(() => useAuthStore.setState({ status: 'resolving' }));
    renderGuarded('/patient');
    expect(screen.getByText(/restoring your session/i)).toBeInTheDocument();

    act(() => {
      useAuthStore.getState().setSession(patient, 'token', 'csrf-token');
    });

    expect(screen.getByText('Patient dashboard')).toBeInTheDocument();
  });

  it('renders the protected content for an allowed role', () => {
    useAuthStore.getState().setSession(patient, 'token');
    renderGuarded('/patient');
    expect(screen.getByText('Patient dashboard')).toBeInTheDocument();
  });

  it('redirects home when the signed-in role is not allowed', () => {
    useAuthStore.getState().setSession({ ...patient, role: 'doctor' }, 'token');
    renderGuarded('/patient');
    expect(screen.getByText('Home page')).toBeInTheDocument();
  });
});
