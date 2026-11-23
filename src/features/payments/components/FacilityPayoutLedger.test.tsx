import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../test/render';
import { FacilityPayoutLedger } from './FacilityPayoutLedger';
import { useAuthStore } from '../../../store/auth-store';
import { formatStroops } from '../../../services/payments-service';
import * as paymentsService from '../../../services/payments-service';
import { EMPTY_LEDGER_PAGE, MOCK_LEDGER_PAGE } from '../../../test/factories';
import type { FacilityLedgerPage } from '../../../types/models';

vi.mock('../../../services/payments-service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../services/payments-service')>();
  return {
    ...actual,
    getFacilityPayoutLedger: vi.fn(),
  };
});

describe('FacilityPayoutLedger & formatStroops', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      accessToken: 'facility-access-token',
      user: {
        id: 'usr-fac',
        email: 'owner@pharma.org',
        role: 'facility',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    });
  });

  describe('formatStroops BigInt helper', () => {
    it('accurately formats stroop values without floating point errors', () => {
      // 10,000,000 stroops = 1 XLM
      expect(formatStroops('10000000', 'XLM')).toBe('1 XLM');
      expect(formatStroops('500000000', 'XLM')).toBe('50 XLM');
      expect(formatStroops('75000000', 'USDC')).toBe('7.50 USDC');
      expect(formatStroops('123456789012345678', 'XLM')).toBe('12345678901.2345678 XLM');
      expect(formatStroops('0', 'XLM')).toBe('0 XLM');
    });
  });

  describe('Component Rendering & Warning States', () => {
    it('renders totals breakdown for both XLM and USDC', async () => {
      vi.mocked(paymentsService.getFacilityPayoutLedger).mockResolvedValue(MOCK_LEDGER_PAGE);

      render(<FacilityPayoutLedger facilityId="fac-1" />);

      await waitFor(() => {
        expect(screen.getByTestId('held-xlm')).toHaveTextContent('25 XLM');
        expect(screen.getByTestId('held-usdc')).toHaveTextContent('15 USDC');
        expect(screen.getByTestId('released-xlm')).toHaveTextContent('50 XLM');
        expect(screen.getByTestId('released-usdc')).toHaveTextContent('80 USDC');
        expect(screen.getByTestId('refunded-xlm')).toHaveTextContent('18 XLM');
      });
    });

    it('highlights approaching refund deadlines with clear warnings', async () => {
      vi.mocked(paymentsService.getFacilityPayoutLedger).mockResolvedValue(MOCK_LEDGER_PAGE);

      render(<FacilityPayoutLedger facilityId="fac-1" />);

      expect(await screen.findByText(/deadline alert/i)).toBeInTheDocument();
      expect(screen.getByText(/Only 14h left to fulfill before escrow funds are automatically refundable/i)).toBeInTheDocument();
    });

    it('provides explorer links to Stellar Expert for on-chain auditability', async () => {
      vi.mocked(paymentsService.getFacilityPayoutLedger).mockResolvedValue(MOCK_LEDGER_PAGE);

      render(<FacilityPayoutLedger facilityId="fac-1" />);

      await screen.findByText('Metformin 850mg (60 tablets)');

      const fundLink = screen.getAllByRole('link', { name: /fund tx/i })[0];
      expect(fundLink).toHaveAttribute(
        'href',
        `https://stellar.expert/explorer/testnet/tx/${MOCK_LEDGER_PAGE.entries[0].fundTxHash}`,
      );
      expect(fundLink).toHaveAttribute('target', '_blank');

      const releaseLink = screen.getAllByRole('link', { name: /release tx/i })[0];
      expect(releaseLink).toHaveAttribute(
        'href',
        `https://stellar.expert/explorer/testnet/tx/${MOCK_LEDGER_PAGE.entries[2].releaseTxHash}`,
      );
    });

    it('filters ledger entries by status and asset', async () => {
      vi.mocked(paymentsService.getFacilityPayoutLedger).mockResolvedValue(MOCK_LEDGER_PAGE);
      const user = userEvent.setup();

      render(<FacilityPayoutLedger facilityId="fac-1" />);
      await screen.findByText('Metformin 850mg (60 tablets)');

      const statusSelect = screen.getByLabelText(/escrow status:/i);
      await user.selectOptions(statusSelect, 'held');

      await waitFor(() =>
        expect(paymentsService.getFacilityPayoutLedger).toHaveBeenCalledWith(
          'fac-1',
          'facility-access-token',
          expect.objectContaining({ status: 'held' }),
          expect.anything(),
        ),
      );
    });
  });

  describe('Query states', () => {
    it('never renders placeholder totals while loading', () => {
      vi.mocked(paymentsService.getFacilityPayoutLedger).mockReturnValue(new Promise(() => {}));

      render(<FacilityPayoutLedger facilityId="fac-1" />);

      expect(screen.getAllByText(/Loading escrow totals/i).length).toBeGreaterThan(0);
      expect(screen.queryByTestId('held-xlm')).not.toBeInTheDocument();
      expect(screen.queryByTestId('released-xlm')).not.toBeInTheDocument();
      expect(screen.queryByText(/0 XLM/)).not.toBeInTheDocument();
    });

    it('shows a retryable error instead of figures when the ledger fails', async () => {
      vi.mocked(paymentsService.getFacilityPayoutLedger).mockRejectedValue(
        new Error('Ledger unavailable'),
      );

      render(<FacilityPayoutLedger facilityId="fac-1" />);

      expect(await screen.findByText(/Escrow totals couldn't be loaded/i)).toBeInTheDocument();
      expect(screen.getByText(/The payout ledger couldn't be loaded/i)).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /try again/i }).length).toBeGreaterThan(0);
      expect(screen.queryByTestId('held-xlm')).not.toBeInTheDocument();
    });

    it('shows an honest empty state when the ledger genuinely has no entries', async () => {
      vi.mocked(paymentsService.getFacilityPayoutLedger).mockResolvedValue(EMPTY_LEDGER_PAGE);

      render(<FacilityPayoutLedger facilityId="fac-1" />);

      expect(await screen.findByRole('heading', { name: /No escrow entries/i })).toBeInTheDocument();
      // A real zero is still shown — only loading must avoid zeroes.
      expect(screen.getByTestId('held-xlm')).toHaveTextContent('0 XLM');
    });

    it('keeps earlier pages when loading the next page fails', async () => {
      const firstPage: FacilityLedgerPage = {
        ...MOCK_LEDGER_PAGE,
        entries: [MOCK_LEDGER_PAGE.entries[0]],
        nextCursor: 'cursor-2',
      };
      vi.mocked(paymentsService.getFacilityPayoutLedger)
        .mockResolvedValueOnce(firstPage)
        .mockRejectedValueOnce(new Error('Page 2 failed'));

      const user = userEvent.setup();
      render(<FacilityPayoutLedger facilityId="fac-1" />);

      expect(await screen.findByText('Metformin 850mg (60 tablets)')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /load more/i }));

      expect(await screen.findByText(/Couldn't load more entries/i)).toBeInTheDocument();
      expect(screen.getByText('Metformin 850mg (60 tablets)')).toBeInTheDocument();
    });
  });
});
