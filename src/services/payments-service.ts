// Payments calls to docforum-core — real endpoints (Phase 5.5, that
// repo's docs/adr/0004-custodial-payments-v1.md), not assumed. This repo
// never calls Stellar/docforum-escrow directly (hard rule 1,
// ARCHITECTURE_ESSENTIALS.md) — everything here goes through
// docforum-core's API.
import { apiFetch } from './api-client';
import type { OrderTypeForPayment, PaymentIntent, WalletLink, PayoutAsset, FacilityLedgerPage } from '../types/models';

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

