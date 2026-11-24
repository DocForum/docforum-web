import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { LoginPage } from './LoginPage';
import { useAuthStore } from '../store/auth-store';
import * as authService from '../services/auth-service';

vi.mock('../services/auth-service');

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

describe('LoginPage MFA redirect', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: null, user: null });
    vi.mocked(authService.login).mockReset();
    vi.mocked(authService.verifyTwoFactor).mockReset();
    vi.mocked(authService.isAuthSession).mockImplementation(
      (result) => 'user' in result && 'accessToken' in result,
    );
  });

  it('keeps the original invite destination after the second sign-in step', async () => {
    vi.mocked(authService.login).mockResolvedValue({ mfaRequired: true, mfaToken: 'challenge-token' });
    vi.mocked(authService.verifyTwoFactor).mockResolvedValue({
      user: { id: 'user-1', email: 'person@example.test', role: 'patient', createdAt: '', updatedAt: '' },
      accessToken: 'session-token',
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter
          initialEntries={[
            { pathname: '/login', state: { returnTo: '/patient/appointments/appointment-1?invite=invite-token' } },
          ]}
        >
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/patient/appointments/:id" element={<p>Invite destination</p>} />
          </Routes>
          <LocationProbe />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await user.type(screen.getByLabelText(/email/i), 'person@example.test');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /log in/i }));
    await user.type(await screen.findByLabelText(/authenticator or recovery code/i), '123456');
    await user.click(screen.getByRole('button', { name: /verify and sign in/i }));

    expect(await screen.findByText('Invite destination')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/patient/appointments/appointment-1?invite=invite-token');
    });
  });
});
