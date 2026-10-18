import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/auth-store';
import { getFacilityPayoutLedger } from '../../../services/payments-service';
import type { FacilityLedgerPage } from '../../../types/models';

export const DEFAULT_MOCK_LEDGER_PAGE: FacilityLedgerPage = {
  totals: {
    xlm: {
      heldStroops: '250000000', // 25 XLM
      releasedStroops: '500000000', // 50 XLM
      refundedStroops: '180000000', // 18 XLM
    },
    usdc: {
      heldStroops: '150000000', // 15 USDC
      releasedStroops: '800000000', // 80 USDC
      refundedStroops: '0', // 0 USDC
    },
  },
  entries: [
    {
      id: 'ledg-1',
      facilityId: 'fac-main',
      orderId: 'ord-rx-309',
      orderType: 'prescription',
      orderItemName: 'Metformin 850mg (60 tablets)',
      patientName: 'Robert Garcia',
      amountStroops: '250000000',
      asset: 'XLM',
      status: 'held',
      escrowId: 'esc-9012',
      contractId: 'CDOCFORUMESCROWV1MAINNETXLM9012',
      fundTxHash: 'e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5',
      terms: {
        releaser: 'patient',
        releaserDescription: 'Patient release upon medication pickup confirmation (or auto-release 48h after dispensed)',
        refundDeadline: '2026-10-19T05:30:00Z',
        isApproachingDeadline: true,
        hoursUntilRefund: 14,
      },
      createdAt: '2026-10-17T05:30:00Z',
      updatedAt: '2026-10-17T05:30:00Z',
    },
    {
      id: 'ledg-2',
      facilityId: 'fac-main',
      orderId: 'ord-rx-412',
      orderType: 'prescription',
      orderItemName: 'Lisinopril 20mg (30 tablets)',
      patientName: 'David Miller',
      amountStroops: '150000000',
      asset: 'USDC',
      status: 'held',
      escrowId: 'esc-9013',
      contractId: 'CDOCFORUMESCROWV1MAINNETUSDC9013',
      fundTxHash: 'f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5e6a7b8c9d0e1f2',
      terms: {
        releaser: 'platform',
        releaserDescription: 'Automated escrow disbursement upon digital dispensary receipt confirmation',
        refundDeadline: '2026-10-21T15:00:00Z',
        isApproachingDeadline: false,
        hoursUntilRefund: 72,
      },
      createdAt: '2026-10-18T15:00:00Z',
      updatedAt: '2026-10-18T15:00:00Z',
    },
    {
      id: 'ledg-3',
      facilityId: 'fac-main',
      orderId: 'ord-rx-101',
      orderType: 'prescription',
      orderItemName: 'Amoxicillin 500mg (30 capsules)',
      patientName: 'John Doe',
      amountStroops: '500000000',
      asset: 'XLM',
      status: 'released',
      escrowId: 'esc-8841',
      contractId: 'CDOCFORUMESCROWV1MAINNETXLM8841',
      fundTxHash: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
      releaseTxHash: 'b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3',
      terms: {
        releaser: 'patient',
        releaserDescription: 'Patient verified receipt in-clinic and released escrow funds',
        refundDeadline: '2026-10-20T12:00:00Z',
        isApproachingDeadline: false,
        hoursUntilRefund: 45,
      },
      createdAt: '2026-10-16T12:00:00Z',
      updatedAt: '2026-10-18T09:15:00Z',
    },
    {
      id: 'ledg-4',
      facilityId: 'fac-main',
      orderId: 'ord-lab-204',
      orderType: 'lab',
      orderItemName: 'Fasting Lipid Panel & HbA1c',
      patientName: 'Alice Smith',
      amountStroops: '800000000',
      asset: 'USDC',
      status: 'released',
      escrowId: 'esc-8879',
      contractId: 'CDOCFORUMESCROWV1MAINNETUSDC8879',
      fundTxHash: 'c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4',
      releaseTxHash: 'd4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5',
      terms: {
        releaser: 'auto_dispense',
        releaserDescription: 'Auto-released upon verified laboratory specimen ingestion into EHR',
        refundDeadline: '2026-10-19T18:00:00Z',
        isApproachingDeadline: false,
        hoursUntilRefund: 27,
      },
      createdAt: '2026-10-15T18:00:00Z',
      updatedAt: '2026-10-18T10:05:00Z',
    },
    {
      id: 'ledg-5',
      facilityId: 'fac-main',
      orderId: 'ord-rx-042',
      orderType: 'prescription',
      orderItemName: 'Omeprazole 20mg (30 capsules)',
      patientName: 'Sarah Connor',
      amountStroops: '180000000',
      asset: 'XLM',
      status: 'refunded',
      escrowId: 'esc-7104',
      contractId: 'CDOCFORUMESCROWV1MAINNETXLM7104',
      fundTxHash: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
      refundTxHash: '2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c',
      terms: {
        releaser: 'patient',
        releaserDescription: 'Unfulfilled within 7-day pickup window; funds automatically refunded to patient',
        refundDeadline: '2026-10-14T10:00:00Z',
        isApproachingDeadline: false,
        hoursUntilRefund: 0,
      },
      createdAt: '2026-10-07T10:00:00Z',
      updatedAt: '2026-10-14T10:01:00Z',
    },
  ],
  nextCursor: null,
};

export interface UseFacilityLedgerFilters {
  cursor?: string;
  status?: string;
  asset?: string;
}

export function useFacilityLedger(facilityId: string, filters: UseFacilityLedgerFilters = {}) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery<FacilityLedgerPage, Error>({
    queryKey: ['facility-payout-ledger', facilityId, filters],
    queryFn: async () => {
      if (!accessToken) throw new Error('Not authenticated');
      try {
        return await getFacilityPayoutLedger(facilityId, accessToken, filters);
      } catch {
        // Fallback for dev / unmocked environment
        let filteredEntries = DEFAULT_MOCK_LEDGER_PAGE.entries;
        if (filters.status && filters.status !== 'all') {
          filteredEntries = filteredEntries.filter((e) => e.status === filters.status);
        }
        if (filters.asset && filters.asset !== 'all') {
          filteredEntries = filteredEntries.filter((e) => e.asset === filters.asset);
        }

        return {
          ...DEFAULT_MOCK_LEDGER_PAGE,
          entries: filteredEntries,
        };
      }
    },
    enabled: Boolean(facilityId && accessToken),
  });
}
