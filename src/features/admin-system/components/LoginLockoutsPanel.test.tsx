import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor, within } from '../../../test/render';
import * as systemService from '../../../services/system-health-service';
import { ApiError } from '../../../services/api-client';
import { LoginLockoutsPanel } from './LoginLockoutsPanel';

vi.mock('../../../services/system-health-service');

beforeEach(() => {
  vi.mocked(systemService.clearLoginAttempts).mockReset();
});

describe('LoginLockoutsPanel', () => {
  it('validates the email before opening the confirmation', async () => {
    const user = userEvent.setup();
    render(<LoginLockoutsPanel />, { role: 'admin' });

    await user.click(screen.getByRole('button', { name: 'Clear lockout' }));

    expect(
      await screen.findByText(/enter the email address the user signs in with/i),
    ).toBeInTheDocument();
    expect(systemService.clearLoginAttempts).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('asks for confirmation and does nothing when cancelled', async () => {
    const user = userEvent.setup();
    render(<LoginLockoutsPanel />, { role: 'admin' });

    await user.type(screen.getByLabelText('Email address'), 'locked@example.test');
    await user.click(screen.getByRole('button', { name: 'Clear lockout' }));

    const dialog = await screen.findByRole('dialog', {
      name: /clear the login lockout for locked@example\.test\?/i,
    });
    expect(dialog).toHaveTextContent(/does not change their password/i);

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(systemService.clearLoginAttempts).not.toHaveBeenCalled();
  });

  it('clears the lockout after confirmation and reports the count', async () => {
    vi.mocked(systemService.clearLoginAttempts).mockResolvedValue({ cleared: 2 });
    const user = userEvent.setup();
    render(<LoginLockoutsPanel />, { role: 'admin' });

    await user.type(screen.getByLabelText('Email address'), 'locked@example.test');
    await user.click(screen.getByRole('button', { name: 'Clear lockout' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Clear lockout' }));

    await waitFor(() => {
      expect(systemService.clearLoginAttempts).toHaveBeenCalledWith(
        { email: 'locked@example.test' },
        'test-admin-token',
      );
    });
    const result = await screen.findByRole('status');
    expect(result).toHaveTextContent('Lockout cleared');
    expect(result).toHaveTextContent(/cleared 2 failed sign-in attempts/i);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('says nothing changed when there was no active lockout', async () => {
    vi.mocked(systemService.clearLoginAttempts).mockResolvedValue({ cleared: 0 });
    const user = userEvent.setup();
    render(<LoginLockoutsPanel />, { role: 'admin' });

    await user.type(screen.getByLabelText('Email address'), 'unknown@example.test');
    await user.click(screen.getByRole('button', { name: 'Clear lockout' }));
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Clear lockout' }),
    );

    const result = await screen.findByRole('status');
    expect(result).toHaveTextContent('No lockout found');
    expect(result).toHaveTextContent(/nothing changed/i);
    expect(result).not.toHaveTextContent(/account exists/i);
  });

  it('explains an authorization failure without pretending it worked', async () => {
    vi.mocked(systemService.clearLoginAttempts).mockRejectedValue(
      new ApiError('Forbidden', 403),
    );
    const user = userEvent.setup();
    render(<LoginLockoutsPanel />, { role: 'admin' });

    await user.type(screen.getByLabelText('Email address'), 'locked@example.test');
    await user.click(screen.getByRole('button', { name: 'Clear lockout' }));
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Clear lockout' }),
    );

    const result = await screen.findByRole('status');
    expect(result).toHaveTextContent('Not allowed');
    expect(result).toHaveTextContent(/does not have admin access/i);
  });
});
