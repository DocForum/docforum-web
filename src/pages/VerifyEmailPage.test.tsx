import { StrictMode } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { VerifyEmailPage } from './VerifyEmailPage';
import * as authService from '../services/auth-service';
import { ApiError } from '../services/api-client';
import { PATIENT_USER as VERIFIED_PATIENT } from '../mocks/fixtures';
import type { User } from '../types/models';
import { useAuthStore } from '../store/auth-store';

// The seeded persona is verified; these tests need an unverified account.
const PATIENT_USER: User = { ...VERIFIED_PATIENT, emailVerifiedAt: null };

function SearchValue() {
  const location = useLocation();
  return <div data-testid="search-value">{location.search}</div>;
}

function renderPage(path: string) {
  return render(
    <StrictMode>
      <MemoryRouter initialEntries={[path]}>
        <SearchValue />
        <VerifyEmailPage />
      </MemoryRouter>
    </StrictMode>,
  );
}

describe('VerifyEmailPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({ user: null, accessToken: null });
  });

  it('does not call the API without a token', () => {
    const verify = vi.spyOn(authService, 'verifyEmail');
    renderPage('/verify-email');
    expect(screen.getByRole('alert')).toHaveTextContent('invalid or has already been used');
    expect(verify).not.toHaveBeenCalled();
  });

  it('verifies once in StrictMode and removes the single-use token from the URL', async () => {
    useAuthStore.setState({ user: PATIENT_USER, accessToken: 'access-token' });
    const verify = vi.spyOn(authService, 'verifyEmail').mockResolvedValue({
      emailVerifiedAt: '2026-02-01T10:00:00.000Z',
    });

    renderPage('/verify-email?token=one-time-token');

    expect(await screen.findByRole('status')).toHaveTextContent('Your email address is verified');
    expect(screen.getByTestId('search-value')).toHaveTextContent('');
    expect(verify).toHaveBeenCalledTimes(1);
    expect(verify).toHaveBeenCalledWith('one-time-token');
    expect(useAuthStore.getState().user?.emailVerifiedAt).toBe('2026-02-01T10:00:00.000Z');
    const storedValues = [localStorage, sessionStorage]
      .flatMap((storage) => Object.keys(storage).map((key) => storage.getItem(key) ?? ''))
      .join('\n');
    expect(storedValues).not.toContain('one-time-token');
  });

  it('shows the signed-out expired-link state without exposing the token', async () => {
    vi.spyOn(authService, 'verifyEmail').mockRejectedValue(
      new ApiError('expired', 400, { code: 'VERIFICATION_TOKEN_EXPIRED' }, { code: 'VERIFICATION_TOKEN_EXPIRED' }),
    );

    renderPage('/verify-email?token=expired-token');

    expect(await screen.findByRole('alert')).toHaveTextContent('link has expired');
    expect(screen.getByRole('link', { name: /sign in to request/i })).toHaveAttribute('href', '/login');
    await waitFor(() => expect(screen.getByTestId('search-value')).toHaveTextContent(''));
  });

  it('offers resend for an invalid link to a signed-in unverified user', async () => {
    useAuthStore.setState({ user: PATIENT_USER, accessToken: 'access-token' });
    vi.spyOn(authService, 'verifyEmail').mockRejectedValue(
      new ApiError('invalid', 400, { code: 'INVALID_VERIFICATION_TOKEN' }, { code: 'INVALID_VERIFICATION_TOKEN' }),
    );

    renderPage('/verify-email?token=invalid-token');

    expect(await screen.findByRole('alert')).toHaveTextContent('invalid or has already been used');
    expect(screen.getByRole('button', { name: 'Send a new link' })).toBeInTheDocument();
  });

  it('treats an old link as success when the signed-in user is already verified', async () => {
    useAuthStore.setState({
      user: { ...PATIENT_USER, emailVerifiedAt: '2026-01-01T00:00:00.000Z' },
      accessToken: 'access-token',
    });
    vi.spyOn(authService, 'verifyEmail').mockRejectedValue(
      new ApiError('used', 400, { code: 'INVALID_VERIFICATION_TOKEN' }, { code: 'INVALID_VERIFICATION_TOKEN' }),
    );

    renderPage('/verify-email?token=used-token');

    expect(await screen.findByRole('status')).toHaveTextContent('Your email address is verified');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
