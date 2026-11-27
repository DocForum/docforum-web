// Seed data for the facility screens that the original mock API (issue #95)
// didn't cover yet: the payout ledger (#53) and scan-to-verify tokens (#52).
// Everything is obviously fake: `(fake)` names, invented escrow ids and
// transaction hashes. Shapes mirror src/types/models.ts.
import type { VerifyOrderResponse } from '../types/models';

const HOUR = 60 * 60_000;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
const ahead = (ms: number) => new Date(Date.now() + ms).toISOString();

export function createFacilityExtras() {
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

  return { verifyOrders };
}
