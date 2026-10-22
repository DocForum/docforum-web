import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../test/render';
import { SignupForm } from './SignupForm';
import { useAuthStore } from '../../../store/auth-store';
import { ApiError } from '../../../services/api-client';
import * as authService from '../../../services/auth-service';

vi.mock('../../../services/auth-service');

describe('SignupForm', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: null, user: null });
    vi.mocked(authService.signup).mockReset();
  });

  it('offers only patient and doctor as self-serve roles, never facility', () => {
    render(<SignupForm />);

    // PRD OQ-2: facility accounts are admin-invited only — no self-serve
    // facility signup should ever be offered here.
    expect(screen.getByRole('radio', { name: 'Patient' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Doctor' })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /facility/i })).not.toBeInTheDocument();
  });

  it('defaults to the patient role', () => {
    render(<SignupForm />);
    expect(screen.getByRole('radio', { name: 'Patient' })).toBeChecked();
  });

  it('shows validation errors instead of submitting when fields are empty', async () => {
    const user = userEvent.setup();
    render(<SignupForm />);

    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText('Full name is required.')).toBeInTheDocument();
    expect(screen.getByText('Email is required.')).toBeInTheDocument();
    expect(screen.getByText('Password is required.')).toBeInTheDocument();
    expect(authService.signup).not.toHaveBeenCalled();
  });

  it('maps server validation errors onto fields', async () => {
    vi.mocked(authService.signup).mockRejectedValue(
      new ApiError('Validation failed', 400, {
        details: [{ field: 'email', message: 'Email already registered' }],
      }),
    );
    const user = userEvent.setup();
    render(<SignupForm />);

    await user.type(screen.getByLabelText(/full name/i), 'Jane');
    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() =>
      expect(screen.getByText('Email already registered')).toBeInTheDocument(),
    );
    expect(authService.signup).toHaveBeenCalledTimes(1);
    expect(vi.mocked(authService.signup).mock.calls[0][0]).toEqual({
      role: 'patient',
      fullName: 'Jane',
      email: 'a@b.com',
      password: 'password123',
    });
  });
});
