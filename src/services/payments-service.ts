// Payments calls to docforum-core — real endpoints (Phase 5.5, that repo's
// docs/adr/0004-custodial-payments-v1.md). This repo never calls
// Stellar/docforum-escrow directly (hard rule 1) — everything goes through
// docforum-core's API, typed by the generated client.
//
// `amountStroops` stays a string end-to-end: BigInt values come over the wire
// as strings and must never round-trip through a JS number.
import type { Schemas } from '@docforum/api-client';
import { api, apiFetch, ApiError, createIdempotencyKey } from './api-client';
import type {
  FacilityLedgerPage,
  PaymentIntent,
  PreparedTransaction,
} from '../types/models';

export function linkWallet(stellarPublicKey: string, accessToken: string): Promise<Schemas['WalletLink']> {
  return api.payments.linkWallet(
    { stellarPublicKey },
    // One key per user action; api-client reuses it across network retries.
    { accessToken, idempotencyKey: createIdempotencyKey() },
  );
}

export function getOwnWalletLink(accessToken: string, signal?: AbortSignal): Promise<Schemas['WalletLink']> {
  return api.payments.getOwnWalletLink({ accessToken, signal });
}

export type CreatePaymentIntentInput = Schemas['CreatePaymentIntentInput'];

export function createPaymentIntent(
  input: CreatePaymentIntentInput,
  accessToken: string,
): Promise<Schemas['PaymentIntent']> {
  return api.payments.createIntent(input, { accessToken, idempotencyKey: createIdempotencyKey() });
}

export function getPaymentIntent(
  id: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<Schemas['PaymentIntent']> {
  return api.payments.getIntent(id, { accessToken, signal });
}

/**
 * The payment intent for a patient's order, or `null` when the order has
 * none (issue #61 — the panel simply hides). ASSUMED lookup: docforum-core
 * doesn't serve intents by order yet (docforum-core#85, real FKs on
 * PaymentIntent, is open) — see ARCHITECTURE_ESSENTIALS.md "Known
 * assumptions — Patient order detail & payment panel". A `404` means
 * "no intent for this order", not an error the UI should show.
 */
export function getPaymentIntentForOrder(
  orderId: string,
  accessToken: string,
): Promise<PaymentIntent | null> {
  return apiFetch<PaymentIntent>(
    `/payments/intents?orderId=${encodeURIComponent(orderId)}`,
    { accessToken },
  )
    .then((intent) => intent ?? null)
    .catch((error: unknown) => {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    });
}

export function fundPaymentIntent(id: string, accessToken: string): Promise<Schemas['PaymentIntent']> {
  return api.payments.fundIntent(id, { accessToken, idempotencyKey: createIdempotencyKey() });
}

export function releasePaymentIntent(id: string, accessToken: string): Promise<Schemas['PaymentIntent']> {
  return api.payments.releaseIntent(id, { accessToken, idempotencyKey: createIdempotencyKey() });
}

export function refundPaymentIntent(id: string, accessToken: string): Promise<Schemas['PaymentIntent']> {
  return api.payments.refundIntent(id, { accessToken, idempotencyKey: createIdempotencyKey() });
}

// --- Pay with wallet (issue #59) -------------------------------------------
// Assumed contracts, pending docforum-core#80 (prepare) and #81 (submit).
// The order→intent lookup itself is issue #61's assumed contract
// (`getPaymentIntentForOrder` above): one lookup serves the status panel
// and this flow, so there is no second shape to keep in step.

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

/** Machine code from the API's error envelope, when it carries one
 * (e.g. `WALLET_NOT_LINKED`). Callers must degrade to the HTTP status when
 * this is undefined. */
export function apiErrorCode(error: unknown): string | undefined {
  if (!(error instanceof ApiError)) return undefined;
  if (typeof error.code === 'string') return error.code;
  if (typeof error.body !== 'object' || error.body === null) return undefined;
  const code = (error.body as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

/**
 * Safely format Stellar stroop amounts (1 XLM / USDC = 10,000,000 stroops = 7 decimals)
 * using BigInt to prevent IEEE 754 precision issues with large amounts.
 */
export function formatStroops(amountStroops: string | bigint, asset?: string): string {
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

export interface FacilityLedgerFilters {
  status?: string;
  /** ISO date or date-time; a date-only `to` is made end-of-day by the API. */
  from?: string;
  to?: string;
  cursor?: string;
  limit?: number;
}

/**
 * The caller's facility payout ledger (issue #271) — the real
 * `GET /payments/facility/ledger`, scoped to the signed-in facility by the
 * server. Status/date filtering, cursor pagination and the lifecycle totals
 * are all server-side. Only the parameters the API accepts are sent (it
 * rejects unknown query parameters).
 */
export function getFacilityPayoutLedger(
  accessToken: string,
  params: FacilityLedgerFilters = {},
  signal?: AbortSignal,
): Promise<FacilityLedgerPage> {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.from) query.set('from', params.from);
  if (params.to) query.set('to', params.to);
  if (params.cursor) query.set('cursor', params.cursor);
  if (params.limit) query.set('limit', String(params.limit));
  const qs = query.toString() ? `?${query.toString()}` : '';
  return apiFetch<FacilityLedgerPage>(`/payments/facility/ledger${qs}`, { accessToken, signal });
}
