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
});
