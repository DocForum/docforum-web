import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../test/render';
import { ClaimAccountForm } from './ClaimAccountForm';
import * as dependentsService from '../../../services/dependents-service';

vi.mock('../../../services/dependents-service');

describe('ClaimAccountForm', () => {
  beforeEach(() => {
    vi.mocked(dependentsService.claimAccount).mockReset();
  });

  it('validates password length', async () => {
    const user = userEvent.setup();

    render(<ClaimAccountForm token="test-token" />);

    await user.type(screen.getByLabelText(/^email$/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'short');
    await user.type(screen.getByLabelText(/confirm password/i), 'short');
    await user.click(screen.getByRole('button', { name: /claim account/i }));

    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(dependentsService.claimAccount).not.toHaveBeenCalled();
  });

  it('validates password match', async () => {
    const user = userEvent.setup();

    render(<ClaimAccountForm token="test-token" />);

    await user.type(screen.getByLabelText(/^email$/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'different');
    await user.click(screen.getByRole('button', { name: /claim account/i }));

    expect(await screen.findByText(/do not match/i)).toBeInTheDocument();
    expect(dependentsService.claimAccount).not.toHaveBeenCalled();
  });

  it('claims account successfully', async () => {
    vi.mocked(dependentsService.claimAccount).mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<ClaimAccountForm token="test-token" />);

    await user.type(screen.getByLabelText(/^email$/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /claim account/i }));

    await waitFor(() => {
      expect(dependentsService.claimAccount).toHaveBeenCalledWith({
        token: 'test-token',
        email: 'test@example.com',
        password: 'password123',
      });
    });

    expect(await screen.findByText(/account claimed/i)).toBeInTheDocument();
  });
});
