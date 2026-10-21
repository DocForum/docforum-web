// Payments calls to docforum-core — real endpoints (Phase 5.5, that
// repo's docs/adr/0004-custodial-payments-v1.md), not assumed. This repo
// never calls Stellar/docforum-escrow directly (hard rule 1,
// ARCHITECTURE_ESSENTIALS.md) — everything here goes through
// docforum-core's API.
import { apiFetch, ApiError } from './api-client';
import type {
  OrderTypeForPayment,
  PaymentIntent,
  PreparedTransaction,
  WalletLink,
  PayoutAsset,
  FacilityLedgerPage,
} from '../types/models';

export function linkWallet(stellarPublicKey: string, accessToken: string): Promise<WalletLink> {
  return apiFetch<WalletLink>('/payments/wallet-link', {
    method: 'POST',
    body: { stellarPublicKey },
    accessToken,
  });
}

export function getOwnWalletLink(accessToken: string): Promise<WalletLink> {
  return apiFetch<WalletLink>('/payments/wallet-link', { accessToken });
}

export interface CreatePaymentIntentInput {
  orderType: OrderTypeForPayment;
  orderId: string;
  patientProfileId: string;
  facilityId: string;
  amountStroops: string;
}

export function createPaymentIntent(input: CreatePaymentIntentInput, accessToken: string): Promise<PaymentIntent> {
  return apiFetch<PaymentIntent>('/payments/intents', { method: 'POST', body: input, accessToken });
}

export function getPaymentIntent(id: string, accessToken: string): Promise<PaymentIntent> {
  return apiFetch<PaymentIntent>(`/payments/intents/${id}`, { accessToken });
}

export function fundPaymentIntent(id: string, accessToken: string): Promise<PaymentIntent> {
  return apiFetch<PaymentIntent>(`/payments/intents/${id}/fund`, { method: 'POST', accessToken });
}

export function releasePaymentIntent(id: string, accessToken: string): Promise<PaymentIntent> {
  return apiFetch<PaymentIntent>(`/payments/intents/${id}/release`, { method: 'POST', accessToken });
}

export function refundPaymentIntent(id: string, accessToken: string): Promise<PaymentIntent> {
  return apiFetch<PaymentIntent>(`/payments/intents/${id}/refund`, { method: 'POST', accessToken });
}

// --- Pay with wallet (issue #59) -------------------------------------------
// Assumed contracts, pending docforum-core#80 (prepare) and #81 (submit).
// The panel's intent lookup is likewise assumed: there is no patient-facing
// "intents for this order" endpoint yet (today's `/payments/intents/:id` is
// admin-only), so the shape below is the smallest one that serves both this
// flow and the payment-status panel owed by issue #61.

/** The intent attached to an order, as the owning patient sees it. An empty
 * array means no intent exists yet — the order's payment panel stays hidden. */
export function listOrderPaymentIntents(
  orderId: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<PaymentIntent[]> {
  const params = new URLSearchParams({ orderId });
  return apiFetch<PaymentIntent[]>(`/payments/intents?${params.toString()}`, { accessToken, signal });
}

/** docforum-core#80 (assumed): builds and simulates the `create_escrow`
 * transaction and returns unsigned XDR for the patient's wallet to sign.
 * Patient-only, own intent; `409 WALLET_NOT_LINKED` when no verified wallet
 * link exists. */
export function preparePaymentIntent(id: string, accessToken: string): Promise<PreparedTransaction> {
  return apiFetch<PreparedTransaction>(`/payments/intents/${id}/prepare`, { method: 'POST', accessToken });
}

/** docforum-core#81 (assumed): verifies the signed XDR against what it
 * prepared, fee-bumps, submits and tracks to finality. This repo passes the
 * wallet's signature straight through — it never inspects or rebuilds it. */
export function submitPaymentIntent(id: string, signedXdr: string, accessToken: string): Promise<PaymentIntent> {
  return apiFetch<PaymentIntent>(`/payments/intents/${id}/submit`, {
    method: 'POST',
    body: { signedXdr },
    accessToken,
  });
}

/** Machine code from the API's error body, when the envelope carries one
 * (e.g. `WALLET_NOT_LINKED`). The `{message}` envelope is provisional, so
 * callers must degrade to the HTTP status when this is undefined. */
export function apiErrorCode(error: unknown): string | undefined {
  if (!(error instanceof ApiError) || typeof error.body !== 'object' || error.body === null) return undefined;
  const code = (error.body as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

/**
 * Safely format Stellar stroop amounts (1 XLM / USDC = 10,000,000 stroops = 7 decimals)
 * using BigInt to prevent IEEE 754 precision issues with large amounts.
 */
export function formatStroops(amountStroops: string | bigint, asset?: PayoutAsset): string {
  try {
    const raw = typeof amountStroops === 'bigint' ? amountStroops : BigInt(amountStroops || '0');
    const isNegative = raw < 0n;
    const abs = isNegative ? -raw : raw;
    const whole = abs / 10_000_000n;
    const frac = abs % 10_000_000n;
    const fracPadded = frac.toString().padStart(7, '0');
    let trimmed = fracPadded.replace(/0+$/, '');
    if (trimmed.length > 0 && trimmed.length < 2) {
      trimmed = trimmed.padEnd(2, '0');
    }
    const formattedNum = trimmed.length > 0 ? `${whole.toString()}.${trimmed}` : `${whole.toString()}`;
    const sign = isNegative ? '-' : '';
    return asset ? `${sign}${formattedNum} ${asset}` : `${sign}${formattedNum}`;
  } catch {
    return asset ? `0 ${asset}` : '0';
  }
}

/**
 * Fetch cursor-paginated payout ledger and escrow terms for a facility (Issue #53)
 */
export function getFacilityPayoutLedger(
  facilityId: string,
  accessToken: string,
  params?: { cursor?: string; status?: string; asset?: string }
): Promise<FacilityLedgerPage> {
  const query = new URLSearchParams();
  if (params?.cursor) query.set('cursor', params.cursor);
  if (params?.status && params.status !== 'all') query.set('status', params.status);
  if (params?.asset && params.asset !== 'all') query.set('asset', params.asset);
  const qs = query.toString() ? `?${query.toString()}` : '';
  return apiFetch<FacilityLedgerPage>(`/facilities/${facilityId}/payout-ledger${qs}`, { accessToken });
}

