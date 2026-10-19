import { describe, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '../../../test/render';
import { SignupForm } from './SignupForm';

describe('SignupForm', () => {
  it('offers only patient and doctor as self-serve roles, never facility or admin', () => {
    render(<SignupForm />);

    // PRD OQ-2: facility and admin accounts are invite-only — no
    // self-serve facility/admin signup should ever be offered here.
    expect(screen.getByRole('radio', { name: 'Patient' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Doctor' })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /facility/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /admin/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/role/i)).not.toBeInTheDocument();
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
  });
});
