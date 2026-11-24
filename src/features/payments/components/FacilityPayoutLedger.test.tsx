import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../test/render';
import { FacilityPayoutLedger } from './FacilityPayoutLedger';
import { useAuthStore } from '../../../store/auth-store';
import { formatStroops } from '../../../services/payments-service';
import * as paymentsService from '../../../services/payments-service';
import { ApiError } from '../../../services/api-client';
import type { FacilityLedgerPage } from '../../../types/models';

vi.mock('../../../services/payments-service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../services/payments-service')>();
  return {
    ...actual,
    getFacilityPayoutLedger: vi.fn(),
  };
});

const inHours = (hours: number) => new Date(Date.now() + hours * 3_600_000).toISOString();

const MOCK_LEDGER_DATA: FacilityLedgerPage = {
  totals: [
    {
      asset: { type: 'native', code: 'XLM' },
      escrowed: '500000000', // 50 XLM
      released: '1250000000', // 125 XLM
      refunded: '100000000', // 10 XLM
    },
    {
      asset: { type: 'issued', code: 'USDC' },
      escrowed: '75000000', // 7.5 USDC
      released: '300000000', // 30 USDC
      refunded: '0',
    },
  ],
  items: [
    {
      id: 'ledg-urgent',
      orderType: 'prescription',
      orderId: 'ord-rx-urgent',
      status: 'escrowed',
      amount: '500000000',
      assetCode: 'XLM',
      asset: { type: 'native', code: 'XLM' },
      escrowId: 'esc-111',
      stellarTxHash: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      sorobanContractId: 'CDEMOCONTRACT',
      refundAfter: inHours(12),
      createdAt: '2026-10-17T08:00:00Z',
      updatedAt: '2026-10-17T08:00:00Z',
    },
    {
      id: 'ledg-safe',
      orderType: 'prescription',
      orderId: 'ord-rx-safe',
      status: 'escrowed',
      amount: '75000000',
      assetCode: 'USDC',
      asset: { type: 'issued', code: 'USDC' },
      escrowId: 'esc-222',
      stellarTxHash: '123456abcdef123456abcdef123456abcdef123456abcdef123456abcdef1234',
      sorobanContractId: 'CDEMOCONTRACT',
      refundAfter: inHours(160),
      createdAt: '2026-10-18T10:00:00Z',
      updatedAt: '2026-10-18T10:00:00Z',
    },
    {
      id: 'ledg-released',
      orderType: 'lab_order',
      orderId: 'ord-lab-done',
      status: 'released',
      amount: '300000000',
      assetCode: 'USDC',
      asset: { type: 'issued', code: 'USDC' },
      escrowId: 'esc-333',
      stellarTxHash: 'aaaabbbbccccddddaaaabbbbccccddddaaaabbbbccccddddaaaabbbbccccdddd',
      sorobanContractId: 'CDEMOCONTRACT',
      refundAfter: null,
      createdAt: '2026-10-14T12:00:00Z',
      updatedAt: '2026-10-15T15:00:00Z',
    },
  ],
  nextCursor: null,
};

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
      expect(formatStroops('10000000', 'XLM')).toBe('1 XLM');
      expect(formatStroops('500000000', 'XLM')).toBe('50 XLM');
      expect(formatStroops('75000000', 'USDC')).toBe('7.50 USDC');
      expect(formatStroops('123456789012345678', 'XLM')).toBe('12345678901.2345678 XLM');
      expect(formatStroops('0', 'XLM')).toBe('0 XLM');
    });
  });

  describe('server totals', () => {
    it('renders the totals docforum-core returned, per asset', async () => {
      vi.mocked(paymentsService.getFacilityPayoutLedger).mockResolvedValue(MOCK_LEDGER_DATA);

      render(<FacilityPayoutLedger facilityId="fac-1" />);

      await waitFor(() => {
        expect(screen.getByTestId('held-xlm')).toHaveTextContent('50 XLM');
        expect(screen.getByTestId('held-usdc')).toHaveTextContent('7.50 USDC');
        expect(screen.getByTestId('released-xlm')).toHaveTextContent('125 XLM');
        expect(screen.getByTestId('released-usdc')).toHaveTextContent('30 USDC');
        expect(screen.getByTestId('refunded-xlm')).toHaveTextContent('10 XLM');
      });
    });

    it('never invents data when the real endpoint fails', async () => {
      vi.mocked(paymentsService.getFacilityPayoutLedger).mockRejectedValue(
        new ApiError('Bad Request', 400),
      );

      render(<FacilityPayoutLedger facilityId="fac-1" />);

      expect(
        await screen.findByText(/payout ledger couldn't be loaded/i),
      ).toBeInTheDocument();
      expect(screen.queryByTestId('held-xlm')).not.toBeInTheDocument();
    });
  });

  describe('rendering and warnings', () => {
    it('highlights escrows approaching their refund deadline', async () => {
      vi.mocked(paymentsService.getFacilityPayoutLedger).mockResolvedValue(MOCK_LEDGER_DATA);

      render(<FacilityPayoutLedger facilityId="fac-1" />);

      expect(await screen.findByText(/deadline within 48h/i)).toBeInTheDocument();
    });

    it('links each transaction to Stellar Expert for auditability', async () => {
      vi.mocked(paymentsService.getFacilityPayoutLedger).mockResolvedValue(MOCK_LEDGER_DATA);

      render(<FacilityPayoutLedger facilityId="fac-1" />);

      const links = await screen.findAllByRole('link', { name: /view transaction/i });
      expect(links[0]).toHaveAttribute(
        'href',
        `https://testnet.stellar.expert/explorer/public/transaction/${MOCK_LEDGER_DATA.items[0].stellarTxHash}`,
      );
      expect(links[0]).toHaveAttribute('target', '_blank');
      expect(links).toHaveLength(3);
    });

    it('sends the status filter to the server instead of filtering rows locally', async () => {
      vi.mocked(paymentsService.getFacilityPayoutLedger).mockResolvedValue(MOCK_LEDGER_DATA);
      const user = userEvent.setup();

      render(<FacilityPayoutLedger facilityId="fac-1" />);
      await screen.findByText('ord-rx-urgent');

      await user.selectOptions(screen.getByLabelText('Status'), 'escrowed');

      await waitFor(() => {
        expect(paymentsService.getFacilityPayoutLedger).toHaveBeenCalledWith(
          'facility-access-token',
          expect.objectContaining({ status: 'escrowed', limit: 50 }),
          expect.any(AbortSignal),
        );
      });
    });
  });
});
