// Seed data for the facility screens that the original mock API (issue #95)
// didn't cover yet: the payout ledger (#53) and scan-to-verify tokens (#52).
// Everything is obviously fake: `(fake)` names, invented escrow ids and
// transaction hashes. Shapes mirror src/types/models.ts.
import type { FacilityLedgerPage, VerifyOrderResponse } from '../types/models';
import { FACILITY_ID } from './fixtures';

const HOUR = 60 * 60_000;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
const ahead = (ms: number) => new Date(Date.now() + ms).toISOString();

const fakeTx = (seed: string) => `txdemo${seed.padEnd(52, '0')}`;

export function createFacilityExtras() {
  const payoutLedger: FacilityLedgerPage = {
    totals: {
      xlm: { heldStroops: '930000000', releasedStroops: '500000000', refundedStroops: '180000000' },
      usdc: { heldStroops: '150000000', releasedStroops: '800000000', refundedStroops: '0' },
    },
    nextCursor: null,
    entries: [
      {
        id: 'ledg-demo-1',
        facilityId: FACILITY_ID,
        orderId: 'ord-demo-rx-1',
        orderType: 'prescription',
        orderItemName: 'Demo Amoxicillin 500mg (fake)',
        patientName: 'Pat Placeholder (fake)',
        amountStroops: '500000000',
        asset: 'XLM',
        status: 'held',
        escrowId: 'esc-demo-101 (fake)',
        contractId: 'CD demo escrow contract (fake)',
        fundTxHash: fakeTx('a1'),
        releaseTxHash: null,
        refundTxHash: null,
        terms: {
          releaser: 'patient',
          releaserDescription: 'Patient releases on pickup confirmation, or automatically 48h after dispense (demo).',
          refundDeadline: ahead(14 * HOUR),
          isApproachingDeadline: true,
          hoursUntilRefund: 14,
        },
        createdAt: ago(10 * HOUR),
        updatedAt: ago(10 * HOUR),
      },
      {
        id: 'ledg-demo-2',
        facilityId: FACILITY_ID,
        orderId: 'ord-demo-lab-1',
        orderType: 'lab',
        orderItemName: 'Demo blood panel (fake)',
        patientName: 'Sam Example (fake)',
        amountStroops: '150000000',
        asset: 'USDC',
        status: 'held',
        escrowId: 'esc-demo-102 (fake)',
        contractId: 'CD demo escrow contract (fake)',
        fundTxHash: fakeTx('b2'),
        releaseTxHash: null,
        refundTxHash: null,
        terms: {
          releaser: 'platform',
          releaserDescription: 'Automated release once the lab result is attached to the order (demo).',
          refundDeadline: ahead(72 * HOUR),
          isApproachingDeadline: false,
          hoursUntilRefund: 72,
        },
        createdAt: ago(2 * HOUR),
        updatedAt: ago(2 * HOUR),
      },
      {
        id: 'ledg-demo-3',
        facilityId: FACILITY_ID,
        orderId: 'ord-demo-rx-2',
        orderType: 'prescription',
        orderItemName: 'Demo Metformin 850mg (fake)',
        patientName: 'Quinn Example (fake)',
        amountStroops: '500000000',
        asset: 'XLM',
        status: 'released',
        escrowId: 'esc-demo-103 (fake)',
        contractId: 'CD demo escrow contract (fake)',
        fundTxHash: fakeTx('c3'),
        releaseTxHash: fakeTx('d4'),
        refundTxHash: null,
        terms: {
          releaser: 'auto_dispense',
          releaserDescription: 'Released on verified dispense (demo).',
          refundDeadline: ago(2 * HOUR),
          isApproachingDeadline: false,
          hoursUntilRefund: 0,
        },
        createdAt: ago(3 * 24 * HOUR),
        updatedAt: ago(2 * 24 * HOUR),
      },
      {
        id: 'ledg-demo-4',
        facilityId: FACILITY_ID,
        orderId: 'ord-demo-rx-3',
        orderType: 'prescription',
        orderItemName: 'Demo Omeprazole 20mg (fake)',
        patientName: 'Morgan Testdata (fake)',
        amountStroops: '180000000',
        asset: 'XLM',
        status: 'refunded',
        escrowId: 'esc-demo-104 (fake)',
        contractId: 'CD demo escrow contract (fake)',
        fundTxHash: fakeTx('e5'),
        releaseTxHash: null,
        refundTxHash: fakeTx('f6'),
        terms: {
          releaser: 'patient',
          releaserDescription: 'Unfulfilled within the pickup window; refunded to the patient (demo).',
          refundDeadline: ago(3 * 24 * HOUR),
          isApproachingDeadline: false,
          hoursUntilRefund: 0,
        },
        createdAt: ago(10 * 24 * HOUR),
        updatedAt: ago(3 * 24 * HOUR),
      },
    ],
  };

  const verifyOrders: Record<string, VerifyOrderResponse> = {
    valid: {
      status: 'valid',
      token: 'ord_tok_demo_valid',
      verifiedAt: new Date().toISOString(),
      order: {
        orderId: 'ord-demo-rx-1',
        orderType: 'prescription',
        patientName: 'Pat Placeholder (fake)',
        medicationOrTest: 'Demo Amoxicillin 500mg (fake)',
        instructions: 'Demo instructions (fake): one capsule three times daily for five days.',
        issuedAt: ago(10 * HOUR),
        expiresAt: ahead(14 * 24 * HOUR),
      },
    },
    superseded: {
      status: 'superseded',
      token: 'ord_tok_demo_superseded',
      verifiedAt: new Date().toISOString(),
      order: {
        orderId: 'ord-demo-rx-9',
        orderType: 'prescription',
        patientName: 'Sam Example (fake)',
        medicationOrTest: 'Demo Lisinopril 10mg (fake)',
        instructions: 'Demo: superseded by an updated dosage.',
        issuedAt: ago(6 * 24 * HOUR),
        expiresAt: ahead(20 * 24 * HOUR),
        supersededBy: 'ord-demo-rx-10',
      },
    },
    expired: {
      status: 'expired',
      token: 'ord_tok_demo_expired',
      verifiedAt: new Date().toISOString(),
      order: {
        orderId: 'ord-demo-lab-2',
        orderType: 'lab',
        patientName: 'Quinn Example (fake)',
        medicationOrTest: 'Demo metabolic panel (fake)',
        instructions: 'Demo: this requisition has expired.',
        issuedAt: ago(60 * 24 * HOUR),
        expiresAt: ago(30 * 24 * HOUR),
      },
    },
    fulfilled: {
      status: 'fulfilled',
      token: 'ord_tok_demo_fulfilled',
      verifiedAt: new Date().toISOString(),
      order: {
        orderId: 'ord-demo-rx-2',
        orderType: 'prescription',
        patientName: 'Quinn Example (fake)',
        medicationOrTest: 'Demo Metformin 850mg (fake)',
        instructions: 'Demo: already dispensed.',
        issuedAt: ago(3 * 24 * HOUR),
        expiresAt: ahead(27 * 24 * HOUR),
        fulfilledAt: ago(2 * 24 * HOUR),
        fulfilledByFacility: 'Demo Pharmacy (fake)',
      },
    },
    not_eligible: {
      status: 'not_eligible',
      token: 'ord_tok_demo_not_eligible',
      verifiedAt: new Date().toISOString(),
      message: 'Demo fixture: this order belongs to an uncontracted network.',
      order: null,
    },
  };

  return { payoutLedger, verifyOrders };
}
