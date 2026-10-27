import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { render, screen, waitFor } from '../../../test/render';
import { LoginForm } from './LoginForm';

describe('LoginForm accessibility (#89)', () => {
  it('has no detectable axe violations', async () => {
    const { container } = render(<LoginForm />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('associates validation errors with the field and focuses it', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.click(screen.getByRole('button', { name: /^log in$/i }));

    const email = screen.getByLabelText(/email/i);
    expect(email).toHaveAttribute('aria-invalid', 'true');

    await waitFor(() => expect(email).toHaveFocus());

    const errorId = email.getAttribute('aria-describedby');
    expect(errorId).toBeTruthy();
    expect(document.getElementById(errorId!)).toHaveTextContent(/email is required/i);
  });

  it('announces the pending state', async () => {
    // Keep the request pending forever: this test only checks the live
    // status, and must not hit the network.
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.type(screen.getByLabelText(/email/i), 'patient@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /^log in$/i }));

    expect(screen.getByRole('status')).toHaveTextContent(/logging in/i);
    vi.unstubAllGlobals();
  });
});
