import { describe, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { render, screen, waitFor } from '../../../test/render';
import { SignupForm } from './SignupForm';

describe('SignupForm accessibility (#89)', () => {
  it('has no detectable axe violations', async () => {
    const { container } = render(<SignupForm />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('describes the password requirement', () => {
    render(<SignupForm />);
    const password = screen.getByLabelText(/^password$/i);
    expect(password).toHaveAccessibleDescription(/at least 8 characters/i);
  });

  it('focuses the first invalid field after a failed submit', async () => {
    const user = userEvent.setup();
    render(<SignupForm />);

    await user.click(screen.getByRole('button', { name: /create account/i }));

    const fullName = screen.getByLabelText(/full name/i);
    expect(fullName).toHaveAttribute('aria-invalid', 'true');

    await waitFor(() => expect(fullName).toHaveFocus());
  });

  it('keeps the role choice as a labelled radio group', () => {
    render(<SignupForm />);
    expect(screen.getByRole('radiogroup', { name: /i am a/i })).toBeInTheDocument();
  });
});
