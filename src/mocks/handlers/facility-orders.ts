// Facility payout ledger (#53) and scan-to-verify order tokens (#52).
// These were the two facility screens the original mock API (issue #95)
// didn't cover; the app services had silent fallbacks instead, which made
// dev:mock/demo less honest than it looked.
import { http } from 'msw';
import { db } from '../db';
import { respond } from '../helpers';
import type { VerifyOrderResponse } from '../../types/models';

function matchToken(token: string): VerifyOrderResponse {
  const lower = token.toLowerCase();
  if (lower.includes('superseded')) return { ...db.verifyOrders.superseded, token };
  if (lower.includes('expired')) return { ...db.verifyOrders.expired, token };
  if (lower.includes('fulfilled')) return { ...db.verifyOrders.fulfilled, token };
  if (lower.includes('not_eligible') || lower.includes('ineligible')) {
    return { ...db.verifyOrders.not_eligible, token };
  }
  if (lower.includes('valid') || lower.includes('ord_')) return { ...db.verifyOrders.valid, token };
  return { ...db.verifyOrders.not_eligible, token, message: 'Demo: unknown token (fake).' };
}

export const facilityOrderHandlers = [
  http.get(
    '*/facilities/:facilityId/payout-ledger',
    respond('json', ({ request }) => {
      const url = new URL(request.url);
      const status = url.searchParams.get('status');
      const asset = url.searchParams.get('asset');
      let entries = db.payoutLedger.entries;
      if (status && status !== 'all') entries = entries.filter((e) => e.status === status);
      if (asset && asset !== 'all') entries = entries.filter((e) => e.asset === asset);
      return { ...db.payoutLedger, entries, nextCursor: null };
    }),
  ),

  http.post(
    '*/facilities/me/verify-order',
    respond('json', async ({ request }) => {
      const body = (await request.json().catch(() => ({}))) as { token?: string };
      const token = (body.token ?? '').trim();
      if (!token) {
        return {
          status: 'not_eligible',
          token,
          verifiedAt: new Date().toISOString(),
          message: 'Demo: token required.',
          order: null,
        } satisfies VerifyOrderResponse;
      }
      return matchToken(token);
    }),
  ),
];
