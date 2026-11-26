import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { render, screen, waitFor } from '../../../test/render';
import { LoginForm } from './LoginForm';
import { useAuthStore } from '../../../store/auth-store';
import { ApiError, RateLimitError } from '../../../services/api-client';
import * as authService from '../../../services/auth-service';

vi.mock('../../../services/auth-service');
vi.mock('qrcode', () => ({
  default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,qr') },
}));

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

  it('shows a lockout countdown and disables submit on 429', async () => {
    vi.mocked(authService.login).mockRejectedValue(
      new RateLimitError('Too many attempts', 42),
    );
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    const notice = await screen.findByTestId('lockout-notice');
    expect(notice).toHaveTextContent('Too many attempts. Try again in 42 seconds.');
    expect(screen.getByRole('button', { name: /log in/i })).toBeDisabled();
    // Account-agnostic wording: no existence hints either way.
    expect(notice).not.toHaveTextContent(/account|email/i);
  });

  it('keeps the MFA half-token out of the session and signs in after code verification', async () => {
    vi.mocked(authService.login).mockResolvedValue({
      mfaRequired: true,
      mfaToken: 'memory-only-mfa-token',
    });
    vi.mocked(authService.verifyTwoFactor).mockResolvedValue({
      user: {
        id: 'u-2',
        email: 'a@b.com',
        role: 'patient',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      accessToken: 'session-token',
    });
    const onSuccess = vi.fn();
    const user = userEvent.setup();
    const { container } = render(<LoginForm onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    await user.type(await screen.findByLabelText(/authenticator or recovery code/i), '12 34 56');
    expect(await axe(container)).toHaveNoViolations();
    expect(useAuthStore.getState().accessToken).toBeNull();
    await user.click(screen.getByRole('button', { name: /verify and sign in/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
    expect(authService.verifyTwoFactor).toHaveBeenCalledWith('memory-only-mfa-token', '123456');
    expect(useAuthStore.getState().accessToken).toBe('session-token');
    expect(localStorage.getItem('memory-only-mfa-token')).toBeNull();
    expect(sessionStorage.getItem('memory-only-mfa-token')).toBeNull();
  });

  it('returns to password sign-in when the MFA half-token expires', async () => {
    vi.mocked(authService.login).mockResolvedValue({
      mfaRequired: true,
      mfaToken: 'expired-half-token',
    });
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
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it('keeps the user on the MFA step when a code is wrong or replayed', async () => {
    vi.mocked(authService.login).mockResolvedValue({
      mfaRequired: true,
      mfaToken: 'active-half-token',
    });
    vi.mocked(authService.verifyTwoFactor).mockRejectedValue(
      new ApiError('Rejected', 401, { code: 'INVALID_TOTP_CODE' }),
    );
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /log in/i }));
    const codeInput = await screen.findByLabelText(/authenticator or recovery code/i);
    await user.type(codeInput, '123456');
    await user.click(screen.getByRole('button', { name: /verify and sign in/i }));

    expect(await screen.findByText(/incorrect or has already been used/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/authenticator or recovery code/i)).toBeInTheDocument();
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it('finishes forced enrollment with recovery codes, then returns to password sign-in', async () => {
    vi.mocked(authService.login).mockResolvedValue({
      enrollmentRequired: true,
      enrollmentToken: 'memory-only-enrollment-token',
    });
    vi.mocked(authService.setupTwoFactor).mockResolvedValue({
      secret: 'memory-only-secret',
      otpauthUri: 'otpauth://totp/DocForum:admin@example.test?secret=memory-only-secret',
    });
    vi.mocked(authService.enableTwoFactor).mockResolvedValue({
      recoveryCodes: ['MEMORY1-11111', 'MEMORY2-22222'],
    });
    const user = userEvent.setup();
    const { container } = render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), 'admin-enrollment@docforum.org');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /log in/i }));
    await screen.findByAltText(/authenticator app setup qr code/i);
    expect(await axe(container)).toHaveNoViolations();
    await user.type(screen.getByLabelText(/six-digit authenticator code/i), '123456');
    await user.click(screen.getByRole('button', { name: /enable and show recovery codes/i }));

    expect(await screen.findByText('MEMORY1-11111')).toBeInTheDocument();
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(authService.setupTwoFactor).toHaveBeenCalledWith('memory-only-enrollment-token');
    expect(authService.enableTwoFactor).toHaveBeenCalledWith('memory-only-enrollment-token', '123456');
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);

    await user.click(screen.getByRole('button', { name: /continue to sign in/i }));
    expect(await screen.findByText(/two-factor authentication is enabled/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(useAuthStore.getState().accessToken).toBeNull();
  });
});
