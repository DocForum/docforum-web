import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../test/render';
import { FacilityPayoutLedger } from './FacilityPayoutLedger';
import { useAuthStore } from '../../../store/auth-store';
import { formatStroops } from '../../../services/payments-service';
import * as paymentsService from '../../../services/payments-service';
import type { FacilityLedgerPage } from '../../../types/models';

vi.mock('../../../services/payments-service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../services/payments-service')>();
  return {
    ...actual,
    getFacilityPayoutLedger: vi.fn(),
  };
});

const MOCK_LEDGER_DATA: FacilityLedgerPage = {
  totals: {
    xlm: {
      heldStroops: '500000000', // 50 XLM
      releasedStroops: '1250000000', // 125 XLM
      refundedStroops: '100000000', // 10 XLM
    },
    usdc: {
      heldStroops: '75000000', // 7.5 USDC
      releasedStroops: '300000000', // 30 USDC
      refundedStroops: '0',
    },
  },
  entries: [
    {
      id: 'ledg-urgent',
      facilityId: 'fac-1',
      orderId: 'ord-rx-urgent',
      orderType: 'prescription',
      orderItemName: 'Atorvastatin 40mg',
      patientName: 'David Lee',
      amountStroops: '500000000',
      asset: 'XLM',
      status: 'held',
      escrowId: 'esc-111',
      fundTxHash: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      terms: {
        releaser: 'patient',
        releaserDescription: 'Patient sign-off upon pickup',
        refundDeadline: '2026-10-19T08:00:00Z',
        isApproachingDeadline: true,
        hoursUntilRefund: 12,
      },
      createdAt: '2026-10-17T08:00:00Z',
      updatedAt: '2026-10-17T08:00:00Z',
    },
    {
      id: 'ledg-safe',
      facilityId: 'fac-1',
      orderId: 'ord-rx-safe',
      orderType: 'prescription',
      orderItemName: 'Metformin 500mg',
      patientName: 'Emma Watson',
      amountStroops: '75000000',
      asset: 'USDC',
      status: 'held',
      escrowId: 'esc-222',
      fundTxHash: '123456abcdef123456abcdef123456abcdef123456abcdef123456abcdef1234',
      terms: {
        releaser: 'platform',
        releaserDescription: 'Automated release upon courier drop',
        refundDeadline: '2026-10-25T10:00:00Z',
        isApproachingDeadline: false,
        hoursUntilRefund: 160,
      },
      createdAt: '2026-10-18T10:00:00Z',
      updatedAt: '2026-10-18T10:00:00Z',
    },
    {
      id: 'ledg-released',
      facilityId: 'fac-1',
      orderId: 'ord-lab-done',
      orderType: 'lab',
      orderItemName: 'Complete Blood Count',
      patientName: 'Marcus Cole',
      amountStroops: '300000000',
      asset: 'USDC',
      status: 'released',
      escrowId: 'esc-333',
      fundTxHash: 'aaaabbbbccccddddaaaabbbbccccddddaaaabbbbccccddddaaaabbbbccccdddd',
      releaseTxHash: 'eeeffff00001111222233334444555566667777888899990000aaaabbbbcccc',
      terms: {
        releaser: 'auto_dispense',
        releaserDescription: 'Specimen verified in lab system',
        refundDeadline: '2026-10-16T12:00:00Z',
        isApproachingDeadline: false,
        hoursUntilRefund: 0,
      },
      createdAt: '2026-10-14T12:00:00Z',
      updatedAt: '2026-10-15T15:00:00Z',
    },
  ],
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

    it('highlights approaching refund deadlines with clear warnings', async () => {
      vi.mocked(paymentsService.getFacilityPayoutLedger).mockResolvedValue(MOCK_LEDGER_DATA);

      render(<FacilityPayoutLedger facilityId="fac-1" />);

      expect(await screen.findByText(/deadline alert/i)).toBeInTheDocument();
      expect(screen.getByText(/Only 12h left to fulfill before escrow funds are automatically refundable/i)).toBeInTheDocument();
    });

    it('provides explorer links to Stellar Expert for on-chain auditability', async () => {
      vi.mocked(paymentsService.getFacilityPayoutLedger).mockResolvedValue(MOCK_LEDGER_DATA);

      render(<FacilityPayoutLedger facilityId="fac-1" />);

      await screen.findByText('Atorvastatin 40mg');

      const fundLink = screen.getAllByRole('link', { name: /fund tx/i })[0];
      expect(fundLink).toHaveAttribute(
        'href',
        `https://testnet.stellar.expert/explorer/public/transaction/${MOCK_LEDGER_DATA.entries[0].fundTxHash}`,
      );
      expect(fundLink).toHaveAttribute('target', '_blank');

      const releaseLink = screen.getByRole('link', { name: /release tx/i });
      expect(releaseLink).toHaveAttribute(
        'href',
        `https://testnet.stellar.expert/explorer/public/transaction/${MOCK_LEDGER_DATA.entries[2].releaseTxHash}`,
      );
    });

    it('filters ledger entries by status and asset', async () => {
      vi.mocked(paymentsService.getFacilityPayoutLedger).mockResolvedValue(MOCK_LEDGER_DATA);
      const user = userEvent.setup();

      render(<FacilityPayoutLedger facilityId="fac-1" />);
      await screen.findByText('Atorvastatin 40mg');

      const statusSelect = screen.getByLabelText(/escrow status:/i);
      await user.selectOptions(statusSelect, 'held');

      expect(paymentsService.getFacilityPayoutLedger).toHaveBeenCalledWith(
        'fac-1',
        'facility-access-token',
        expect.objectContaining({ status: 'held' }),
        expect.any(AbortSignal),
      );
    });
  });
});
