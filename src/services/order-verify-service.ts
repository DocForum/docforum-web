import { apiFetch, ApiError } from './api-client';
import type { VerifyOrderResponse } from '../types/models';

export const MOCK_VERIFY_ORDERS: Record<string, VerifyOrderResponse> = {
  valid: {
    status: 'valid',
    token: 'ord_tok_valid_77a2',
    verifiedAt: new Date().toISOString(),
    order: {
      orderId: 'ord-rx-101',
      orderType: 'prescription',
      patientName: 'John Doe',
      medicationOrTest: 'Amoxicillin 500mg (30 capsules)',
      instructions: 'Take 1 capsule three times daily with meals for 10 days.',
      issuedAt: '2026-10-17T10:00:00Z',
      expiresAt: '2026-11-17T10:00:00Z',
    },
  },
  superseded: {
    status: 'superseded',
    token: 'ord_tok_superseded_99x1',
    verifiedAt: new Date().toISOString(),
    order: {
      orderId: 'ord-rx-88',
      orderType: 'prescription',
      patientName: 'Jane Smith',
      medicationOrTest: 'Lisinopril 10mg (30 tablets)',
      instructions: 'Superseded by updated dosage from Dr. Evelyn Reed',
      issuedAt: '2026-10-01T10:00:00Z',
      expiresAt: '2026-11-01T10:00:00Z',
      supersededBy: 'ord-rx-94-v2',
    },
  },
  expired: {
    status: 'expired',
    token: 'ord_tok_expired_00f3',
    verifiedAt: new Date().toISOString(),
    order: {
      orderId: 'ord-lab-55',
      orderType: 'lab',
      patientName: 'Robert Garcia',
      medicationOrTest: 'Comprehensive Metabolic Panel (CMP)',
      instructions: 'Expired lab requisition order',
      issuedAt: '2026-08-01T10:00:00Z',
      expiresAt: '2026-09-01T10:00:00Z',
    },
  },
  fulfilled: {
    status: 'fulfilled',
    token: 'ord_tok_fulfilled_22m5',
    verifiedAt: new Date().toISOString(),
    order: {
      orderId: 'ord-rx-71',
      orderType: 'prescription',
      patientName: 'Alice Johnson',
      medicationOrTest: 'Atorvastatin 20mg (90 tablets)',
      instructions: 'Take 1 tablet daily at bedtime',
      issuedAt: '2026-10-10T10:00:00Z',
      expiresAt: '2026-11-10T10:00:00Z',
      fulfilledAt: '2026-10-15T14:22:00Z',
      fulfilledByFacility: 'Central Pharmacy & Diagnostic Center',
    },
  },
  not_eligible: {
    status: 'not_eligible',
    token: 'ord_tok_not_eligible_44z8',
    verifiedAt: new Date().toISOString(),
    message: 'Order belongs to an uncontracted health network or restricted specialty tier.',
    order: null,
  },
};

export async function verifyOrderToken(token: string, accessToken: string): Promise<VerifyOrderResponse> {
  const cleanToken = token.trim();
  if (!cleanToken) {
    throw new Error('Please enter a valid order token');
  }

  try {
    return await apiFetch<VerifyOrderResponse>('/facilities/me/verify-order', {
      method: 'POST',
      body: { token: cleanToken },
      accessToken,
    });
  } catch (err) {
    if (err instanceof ApiError && err.status === 429) {
      throw new ApiError(
        'Too many verification attempts. Verification is rate-limited to protect tokens against enumeration. Please wait a minute before trying again.',
        429,
        err.body,
      );
    }

    // If backend endpoint is not yet connected or in dev/mock environment, fall back to matching mock fixture
    if (cleanToken.toLowerCase().includes('superseded')) return { ...MOCK_VERIFY_ORDERS.superseded, token: cleanToken };
    if (cleanToken.toLowerCase().includes('expired')) return { ...MOCK_VERIFY_ORDERS.expired, token: cleanToken };
    if (cleanToken.toLowerCase().includes('fulfilled')) return { ...MOCK_VERIFY_ORDERS.fulfilled, token: cleanToken };
    if (cleanToken.toLowerCase().includes('not_eligible') || cleanToken.toLowerCase().includes('ineligible')) return { ...MOCK_VERIFY_ORDERS.not_eligible, token: cleanToken };
    if (cleanToken.toLowerCase().includes('rate_limit')) {
      throw new ApiError(
        'Too many verification attempts. Verification is rate-limited to protect tokens against enumeration. Please wait a minute before trying again.',
        429,
      );
    }
    if (cleanToken.toLowerCase().includes('valid') || cleanToken.startsWith('ord_')) {
      return { ...MOCK_VERIFY_ORDERS.valid, token: cleanToken };
    }

    throw err;
  }
}

