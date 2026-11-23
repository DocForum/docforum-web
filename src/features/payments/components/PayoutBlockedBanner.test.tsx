import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../test/render';
import { PayoutBlockedBanner } from './PayoutBlockedBanner';
import { WalletLinkForm } from './WalletLinkForm';
import { FacilityPayoutLedger } from './FacilityPayoutLedger';
import { useAuthStore } from '../../../store/auth-store';
import { usePayoutBlockStore } from '../../../store/payout-block-store';
import { ApiError } from '../../../services/api-client';
import * as paymentsService from '../../../services/payments-service';
import type { FacilityLedgerPage, WalletLink } from '../../../types/models';

vi.mock('../../../services/payments-service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../services/payments-service')>();
  return {
    ...actual,
    getOwnWalletLink: vi.fn(),
    linkWallet: vi.fn(),
    getFacilityPayoutLedger: vi.fn(),
  };
});

const VALID_KEY = 'G' + 'A'.repeat(55);

const EMPTY_LEDGER_PAGE: FacilityLedgerPage = { items: [], nextCursor: null, totals: [] };

const WALLET: WalletLink = {
  id: 'wl-1',
  facilityId: 'fac-main',
  stellarPublicKey: VALID_KEY,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
};

function blockError(code: 'FACILITY_WALLET_NOT_LINKED' | 'PAYEE_TRUSTLINE_MISSING') {
  return new ApiError(`Payment blocked (${code})`, 400, { message: 'Payment blocked', code }, { code });
}

describe('PayoutBlockedBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      accessToken: 'facility-token',
      user: {
        id: 'usr-fac',
        email: 'owner@pharma.org',
        role: 'facility',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    });
    usePayoutBlockStore.setState({ detectedCode: null, detectedAt: null });
    // The banner's readiness probe reads the ledger; give it a value by default
    // so individual tests only override the outcomes they care about.
    vi.mocked(paymentsService.getFacilityPayoutLedger).mockResolvedValue(EMPTY_LEDGER_PAGE);
  });

  it('shows the missing-wallet banner from the wallet-link 404, linking to wallet setup', async () => {
    vi.mocked(paymentsService.getOwnWalletLink).mockRejectedValue(new ApiError('Not found', 404));

    render(<PayoutBlockedBanner />);

    const banner = await screen.findByTestId('payout-blocked-banner');
    expect(banner).toHaveTextContent(/no payout wallet is linked/i);
    expect(banner).toHaveTextContent(/patients may see their payment fail/i);
    expect(screen.getByRole('link', { name: /open wallet setup/i })).toHaveAttribute('href', '/facility');
  });

  it('shows nothing while the wallet link is still loading', () => {
    vi.mocked(paymentsService.getOwnWalletLink).mockImplementation(() => new Promise(() => {}));

    render(<PayoutBlockedBanner />);

    expect(screen.queryByTestId('payout-blocked-banner')).not.toBeInTheDocument();
  });

  it('shows the trustline guidance for PAYEE_TRUSTLINE_MISSING from a facility payment call', async () => {
    vi.mocked(paymentsService.getOwnWalletLink).mockResolvedValue(WALLET);
    vi.mocked(paymentsService.getFacilityPayoutLedger).mockRejectedValue(
      blockError('PAYEE_TRUSTLINE_MISSING'),
    );

    render(
      <>
        <PayoutBlockedBanner />
        <FacilityPayoutLedger facilityId="fac-main" />
      </>,
    );

    const banner = await screen.findByTestId('payout-blocked-banner');
    expect(banner).toHaveTextContent(/cannot receive this payment type yet/i);
    expect(banner).toHaveTextContent(/USDC trustline/i);
    expect(banner).toHaveTextContent(/US Dollar Coin/i);
    expect(usePayoutBlockStore.getState().detectedCode).toBe('PAYEE_TRUSTLINE_MISSING');
  });

  it('records FACILITY_WALLET_NOT_LINKED returned by a facility payment call', async () => {
    vi.mocked(paymentsService.getOwnWalletLink).mockResolvedValue(WALLET);
    vi.mocked(paymentsService.getFacilityPayoutLedger).mockRejectedValue(
      blockError('FACILITY_WALLET_NOT_LINKED'),
    );

    render(
      <>
        <PayoutBlockedBanner />
        <FacilityPayoutLedger facilityId="fac-main" />
      </>,
    );

    await waitFor(() =>
      expect(usePayoutBlockStore.getState().detectedCode).toBe('FACILITY_WALLET_NOT_LINKED'),
    );
    // A confirmed wallet read supersedes a stale "not linked" code.
    expect(screen.queryByTestId('payout-blocked-banner')).not.toBeInTheDocument();
  });

  it('renders nothing when the wallet is linked and no blocker was reported', async () => {
    vi.mocked(paymentsService.getOwnWalletLink).mockResolvedValue(WALLET);

    render(<PayoutBlockedBanner />);

    await waitFor(() => expect(paymentsService.getOwnWalletLink).toHaveBeenCalled());
    expect(screen.queryByTestId('payout-blocked-banner')).not.toBeInTheDocument();
  });

  it('clears once the link is confirmed after relinking', async () => {
    vi.mocked(paymentsService.getOwnWalletLink)
      .mockRejectedValueOnce(new ApiError('Not found', 404))
      .mockResolvedValue(WALLET);
    vi.mocked(paymentsService.linkWallet).mockResolvedValue(WALLET);
    const user = userEvent.setup();

    render(
      <>
        <PayoutBlockedBanner />
        <WalletLinkForm />
      </>,
    );

    expect(await screen.findByTestId('payout-blocked-banner')).toBeInTheDocument();

    await user.type(screen.getByLabelText(/stellar public key/i), VALID_KEY);
    await user.click(screen.getByRole('button', { name: /link wallet/i }));

    await waitFor(() =>
      expect(paymentsService.linkWallet).toHaveBeenCalledWith(VALID_KEY, 'facility-token'),
    );
    await waitFor(() => expect(screen.queryByTestId('payout-blocked-banner')).not.toBeInTheDocument());
  });
});
