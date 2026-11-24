import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../test/render';
import { LoginForm } from './LoginForm';
import { useAuthStore } from '../../../store/auth-store';
import { ApiError } from '../../../services/api-client';
import * as authService from '../../../services/auth-service';

vi.mock('../../../services/auth-service');

describe('LoginForm', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: null, user: null });
    vi.mocked(authService.login).mockReset();
    vi.mocked(authService.verifyTwoFactor).mockReset();
    vi.mocked(authService.setupTwoFactor).mockReset();
    vi.mocked(authService.enableTwoFactor).mockReset();
    vi.mocked(authService.isAuthSession).mockImplementation(
      (result) => 'user' in result && 'accessToken' in result,
    );
    localStorage.clear();
    sessionStorage.clear();
  });

  it('shows validation errors instead of submitting when fields are empty', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(await screen.findByText('Email is required.')).toBeInTheDocument();
    expect(screen.getByText('Password is required.')).toBeInTheDocument();
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('rejects an invalid email format', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), 'not-an-email');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('maps server validation errors onto fields', async () => {
    vi.mocked(authService.login).mockRejectedValue(
      new ApiError('Validation failed', 400, {
        details: [{ field: 'password', message: 'Incorrect password.' }],
      }),
    );
    const user = userEvent.setup();
    render(<LoginForm />);

    // password long enough to pass client validation, so the server error is reached
    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() =>
      expect(screen.getByText('Incorrect password.')).toBeInTheDocument(),
    );
    expect(authService.login).toHaveBeenCalledTimes(1);
    expect(vi.mocked(authService.login).mock.calls[0][0]).toEqual({
      email: 'a@b.com',
      password: 'password123',
    });
  });

  it('logs in with valid credentials', async () => {
    vi.mocked(authService.login).mockResolvedValue({
      user: { id: 'u-1', email: 'a@b.com', role: 'patient', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
      accessToken: 'token-1',
    });
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledTimes(1);
      expect(vi.mocked(authService.login).mock.calls[0][0]).toEqual({ email: 'a@b.com', password: 'password123' });
    });
  });

  it('verifies a pasted TOTP code without storing the half-token', async () => {
    vi.mocked(authService.login).mockResolvedValue({ mfaRequired: true, mfaToken: 'memory-only-mfa-token' });
    vi.mocked(authService.verifyTwoFactor).mockResolvedValue({
      user: { id: 'u-2', email: 'a@b.com', role: 'patient', createdAt: '', updatedAt: '' },
      accessToken: 'session-token',
    });
    const onSuccess = vi.fn();
    const user = userEvent.setup();
    render(<LoginForm onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /log in/i }));
    const code = await screen.findByLabelText(/authenticator or recovery code/i);
    expect(code).toHaveAttribute('autocomplete', 'one-time-code');
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    await user.type(code, '123 456');
    await user.click(screen.getByRole('button', { name: /verify and sign in/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
    expect(authService.verifyTwoFactor).toHaveBeenCalledWith('memory-only-mfa-token', '123456');
    expect(useAuthStore.getState().accessToken).toBe('session-token');
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it('explains a wrong or replayed authenticator code without leaving the challenge', async () => {
    vi.mocked(authService.login).mockResolvedValue({ mfaRequired: true, mfaToken: 'mfa-token' });
    vi.mocked(authService.verifyTwoFactor).mockRejectedValue(
      new ApiError('Invalid code', 401, { code: 'INVALID_TOTP_CODE' }),
    );
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /log in/i }));
    await user.type(await screen.findByLabelText(/authenticator or recovery code/i), '123456');
    await user.click(screen.getByRole('button', { name: /verify and sign in/i }));

    expect(await screen.findByText(/incorrect or has already been used/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/authenticator or recovery code/i)).toBeInTheDocument();
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it('returns to password entry with a clear message when the MFA token expires', async () => {
    vi.mocked(authService.login).mockResolvedValue({ mfaRequired: true, mfaToken: 'expired-token' });
    vi.mocked(authService.verifyTwoFactor).mockRejectedValue(
      new ApiError('Expired', 401, { code: 'INVALID_MFA_TOKEN' }),
    );
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /log in/i }));
    await user.type(await screen.findByLabelText(/authenticator or recovery code/i), '123456');
    await user.click(screen.getByRole('button', { name: /verify and sign in/i }));

    expect(await screen.findByText(/sign-in step expired/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it('shows recovery codes after forced enrollment and returns to the password step without a session', async () => {
    vi.mocked(authService.login).mockResolvedValue({
      enrollmentRequired: true,
      enrollmentToken: 'memory-only-enrollment-token',
    });
    vi.mocked(authService.setupTwoFactor).mockResolvedValue({
      secret: 'JBSWY3DPEHPK3PXP',
      otpauthUri: 'otpauth://totp/DocForum:test?secret=JBSWY3DPEHPK3PXP',
    });
    vi.mocked(authService.enableTwoFactor).mockResolvedValue({
      recoveryCodes: ['AAAAA-11111', 'BBBBB-22222'],
    });
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), 'admin@example.org');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /log in/i }));
    expect(await screen.findByAltText(/authenticator app setup qr code/i)).toBeInTheDocument();
    expect(screen.getByText('JBSWY3DPEHPK3PXP')).toBeInTheDocument();
    await user.type(screen.getByLabelText(/six-digit authenticator code/i), '123456');
    await user.click(screen.getByRole('button', { name: /enable and show recovery codes/i }));

    expect(await screen.findByText('AAAAA-11111')).toBeInTheDocument();
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    await user.click(screen.getByRole('button', { name: /continue to sign in/i }));
    expect(await screen.findByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByText(/sign in again with your password/i)).toBeInTheDocument();
  });

  it('shows the login lockout countdown returned by the API', async () => {
    vi.mocked(authService.login).mockRejectedValue(
      new ApiError('Too many requests', 429, {}, 2),
    );
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(await screen.findByRole('status')).toHaveTextContent('Try again in 2 seconds');
    expect(screen.getByRole('button', { name: /log in/i })).toBeDisabled();
  });
});
