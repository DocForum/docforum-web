import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '../../../test/render';
import { PATIENT_USER, DOCTOR_USER } from '../../../mocks/fixtures';
import { useAuthStore } from '../../../store/auth-store';
import * as authService from '../../../services/auth-service';
import { ApiError } from '../../../services/api-client';
import { EmailVerificationBanner } from './EmailVerificationBanner';

describe('EmailVerificationBanner', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({ user: null, accessToken: null });
  });

  it('shows only for signed-in users whose email is unverified', () => {
    const { rerender } = render(<EmailVerificationBanner />);
    expect(screen.queryByRole('complementary', { name: 'Email verification' })).not.toBeInTheDocument();

    act(() => useAuthStore.setState({ user: PATIENT_USER, accessToken: 'access-token' }));
    rerender(<EmailVerificationBanner />);
    expect(screen.getByRole('complementary', { name: 'Email verification' })).toBeInTheDocument();

    act(() => useAuthStore.setState({ user: DOCTOR_USER, accessToken: 'access-token' }));
    rerender(<EmailVerificationBanner />);
    expect(screen.queryByRole('complementary', { name: 'Email verification' })).not.toBeInTheDocument();
  });

  it('resends and disables the action for the API countdown', async () => {
    useAuthStore.setState({ user: PATIENT_USER, accessToken: 'access-token' });
    const resend = vi.spyOn(authService, 'resendVerificationEmail').mockResolvedValue({
      resendAfterSeconds: 30,
    });
    render(<EmailVerificationBanner />);

    fireEvent.click(screen.getByRole('button', { name: 'Resend email' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Verification email sent');
    expect(resend).toHaveBeenCalledWith('access-token');
    expect(screen.getByRole('button', { name: 'Resend email (30s)' })).toBeDisabled();
  });

  it('marks the in-memory user verified after EMAIL_ALREADY_VERIFIED', async () => {
    useAuthStore.setState({ user: PATIENT_USER, accessToken: 'access-token' });
    vi.spyOn(authService, 'resendVerificationEmail').mockRejectedValue(
      new ApiError('verified', 409, { code: 'EMAIL_ALREADY_VERIFIED' }),
    );
    render(<EmailVerificationBanner />);

    fireEvent.click(screen.getByRole('button', { name: 'Resend email' }));

    await waitFor(() => expect(useAuthStore.getState().user?.emailVerifiedAt).not.toBeNull());
    expect(useAuthStore.getState().accessToken).toBe('access-token');
    expect(screen.queryByRole('complementary', { name: 'Email verification' })).not.toBeInTheDocument();
  });

  it('uses the server retry delay when resend is rate-limited', async () => {
    useAuthStore.setState({ user: PATIENT_USER, accessToken: 'access-token' });
    vi.spyOn(authService, 'resendVerificationEmail').mockRejectedValue(
      new ApiError('limited', 429, { code: 'EMAIL_VERIFICATION_RATE_LIMITED' }, 15),
    );
    render(<EmailVerificationBanner />);

    fireEvent.click(screen.getByRole('button', { name: 'Resend email' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('wait 15 seconds');
    expect(screen.getByRole('button', { name: 'Resend email (15s)' })).toBeDisabled();
  });

  it('can be dismissed without persisting the dismissal', () => {
    useAuthStore.setState({ user: PATIENT_USER, accessToken: 'access-token' });
    const { rerender } = render(<EmailVerificationBanner />);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss email verification notice' }));
    expect(screen.queryByRole('complementary', { name: 'Email verification' })).not.toBeInTheDocument();

    act(() => useAuthStore.setState({ user: null, accessToken: null }));
    rerender(<EmailVerificationBanner />);
    act(() => useAuthStore.setState({ user: PATIENT_USER, accessToken: 'access-token' }));
    rerender(<EmailVerificationBanner />);
    expect(screen.queryByRole('complementary', { name: 'Email verification' })).not.toBeInTheDocument();
  });
});
