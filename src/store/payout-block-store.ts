// Tracks a payout-block code reported by docforum-core during this session
// (issue #279). In-memory only, like every other store here — nothing
// server-derived is persisted (ARCHITECTURE_ESSENTIALS.md hard rule). The
// banner is derived from this plus the wallet-link query, and clears as soon
// as the link is confirmed or a payment call succeeds again.
import { create } from 'zustand';
import { getPayoutBlockCode, type PayoutBlockCode } from '../services/error-catalogue';

interface PayoutBlockState {
  detectedCode: PayoutBlockCode | null;
  detectedAt: string | null;
  record: (code: PayoutBlockCode) => void;
  clear: () => void;
}

export const usePayoutBlockStore = create<PayoutBlockState>((set) => ({
  detectedCode: null,
  detectedAt: null,
  record: (code) => set({ detectedCode: code, detectedAt: new Date().toISOString() }),
  clear: () => set({ detectedCode: null, detectedAt: null }),
}));

/**
 * Record the payout-block code carried by `error`, if any. Returns the code
 * so callers can decide whether to rethrow instead of masking the failure.
 */
export function recordPayoutBlock(error: unknown): PayoutBlockCode | null {
  const code = getPayoutBlockCode(error);
  if (code) usePayoutBlockStore.getState().record(code);
  return code;
}

/** A payment call succeeded (or the link was re-confirmed), so payouts are
 * demonstrably working again and the banner should go away. */
export function clearPayoutBlock(): void {
  const state = usePayoutBlockStore.getState();
  if (state.detectedCode !== null) state.clear();
}
