import { FACILITY_WALLET_NOT_LINKED, type PayoutBlockCode } from '../../../services/error-catalogue';
import { ApiError } from '../../../services/api-client';
import { usePayoutBlockStore } from '../../../store/payout-block-store';
import { useFacilityLedger } from './useFacilityLedger';
import { useOwnWalletLink } from './useWalletLink';

export type PayoutWalletState = 'loading' | 'linked' | 'missing' | 'unknown';

export interface PayoutBlockStatus {
  /** True only when the blocker is known — an unreachable wallet-link
   * endpoint must not be presented as "payouts blocked". */
  blocked: boolean;
  reason: PayoutBlockCode | null;
  walletState: PayoutWalletState;
}

/**
 * Derives whether payouts are blocked from two things the app already has:
 *
 * 1. the wallet-link status (`GET /payments/wallet-link` — a 404 or a `null`
 *    body means nothing is linked), and
 * 2. a block code docforum-core returned on a facility payment call during
 *    this session (`FACILITY_WALLET_NOT_LINKED` / `PAYEE_TRUSTLINE_MISSING`).
 *
 * There is no trustline endpoint to poll: hard rule 1 forbids asking Stellar
 * from the browser, so the trustline warning can only come from core's own
 * responses and disappears once a payment call succeeds or the link is
 * re-confirmed (see `useFacilityLedger` / `useLinkWallet`).
 */
export function usePayoutBlockStatus(): PayoutBlockStatus {
  const walletQuery = useOwnWalletLink();
  const detectedCode = usePayoutBlockStore((state) => state.detectedCode);

  // Payout readiness probe: there is no trustline-status endpoint, and hard
  // rule 1 forbids asking Stellar from the browser, so a real payment read is
  // the only way to learn that payouts are blocked. This is that read, with
  // the same query key/filters the payouts page uses — React Query shares one
  // request between the banner and the ledger instead of fetching twice.
  useFacilityLedger('fac-main', { status: 'all', asset: 'all' });

  const walletState: PayoutWalletState = walletQuery.isError
    ? walletQuery.error instanceof ApiError && walletQuery.error.status === 404
      ? 'missing'
      : 'unknown'
    : walletQuery.isSuccess
      ? walletQuery.data
        ? 'linked'
        : 'missing'
      : 'loading';

  let reason: PayoutBlockCode | null;
  if (walletState === 'missing') {
    // Nothing linked at all — that outranks any trustline detail, and needs
    // no payment call to have failed first.
    reason = FACILITY_WALLET_NOT_LINKED;
  } else if (walletState === 'linked' && detectedCode === FACILITY_WALLET_NOT_LINKED) {
    // A confirmed link supersedes a stale "not linked" code from an earlier
    // call in this session; the trustline code is a separate condition.
    reason = null;
  } else {
    reason = detectedCode;
  }

  return { blocked: reason !== null, reason, walletState };
}
