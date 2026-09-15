import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../test/render';
import { WalletLinkForm } from './WalletLinkForm';
import { useAuthStore } from '../../../store/auth-store';
import { ApiError } from '../../../services/api-client';
import * as paymentsService from '../../../services/payments-service';

vi.mock('../../../services/payments-service');

const VALID_KEY = 'G' + 'A'.repeat(55);

describe('WalletLinkForm', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'test-token', user: null });
    vi.mocked(paymentsService.getOwnWalletLink).mockReset();
    vi.mocked(paymentsService.linkWallet).mockReset();
  });

  it('shows "no wallet linked yet" when the endpoint 404s', async () => {
    vi.mocked(paymentsService.getOwnWalletLink).mockRejectedValue(new ApiError('Not found', 404));

    render(<WalletLinkForm />);

    expect(await screen.findByText(/no payout wallet linked yet/i)).toBeInTheDocument();
  });

  it('rejects an obviously-invalid public key before ever calling the API', async () => {
    vi.mocked(paymentsService.getOwnWalletLink).mockRejectedValue(new ApiError('Not found', 404));
    const user = userEvent.setup();

    render(<WalletLinkForm />);
    await screen.findByText(/no payout wallet linked yet/i);

    await user.type(screen.getByLabelText(/stellar public key/i), 'not-a-real-key');
    await user.click(screen.getByRole('button', { name: /link wallet/i }));

    expect(await screen.findByText(/enter a valid stellar public key/i)).toBeInTheDocument();
    expect(paymentsService.linkWallet).not.toHaveBeenCalled();
  });

  it('links a valid public key', async () => {
    vi.mocked(paymentsService.getOwnWalletLink).mockRejectedValue(new ApiError('Not found', 404));
    vi.mocked(paymentsService.linkWallet).mockResolvedValue({
      id: 'wl-1',
      facilityId: 'facility-1',
      stellarPublicKey: VALID_KEY,
      createdAt: '2026-09-15T00:00:00.000Z',
      updatedAt: '2026-09-15T00:00:00.000Z',
    });
    const user = userEvent.setup();

    render(<WalletLinkForm />);
    await screen.findByText(/no payout wallet linked yet/i);

    await user.type(screen.getByLabelText(/stellar public key/i), VALID_KEY);
    await user.click(screen.getByRole('button', { name: /link wallet/i }));

    await waitFor(() => expect(paymentsService.linkWallet).toHaveBeenCalledWith(VALID_KEY, 'test-token'));
  });
});
