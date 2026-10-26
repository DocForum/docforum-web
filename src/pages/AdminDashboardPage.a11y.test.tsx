import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { render, screen } from '../test/render';
import { AdminDashboardPage } from './AdminDashboardPage';
import { useAuthStore } from '../store/auth-store';

vi.mock('../services/payments-service');

beforeEach(() => {
  useAuthStore.setState({
    accessToken: 'test-token',
    user: { id: 'admin-1', email: 'admin@docforum.org', role: 'admin', createdAt: '', updatedAt: '' },
  });
});

describe('AdminDashboardPage accessibility (#90)', () => {
  it('has no detectable axe violations', async () => {
    const { container } = render(<AdminDashboardPage />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('gives the lookup a real form and a labelled field', async () => {
    render(<AdminDashboardPage />);

    expect(screen.getByRole('form')).toBeInTheDocument();
    expect(screen.getByLabelText(/payment intent id/i)).toHaveAccessibleDescription(
      /paste the id/i,
    );

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/payment intent id/i), 'intent-1{Enter}');
    // Selecting an id marks it as selected; the PaymentIntentPanel renders below.
    expect(screen.getByRole('form')).toBeInTheDocument();
  });
});
