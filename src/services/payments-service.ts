// Payments calls to docforum-core — real endpoints (Phase 5.5, that
// repo's docs/adr/0004-custodial-payments-v1.md), not assumed. This repo
// never calls Stellar/docforum-escrow directly (hard rule 1,
// ARCHITECTURE_ESSENTIALS.md) — everything here goes through
// docforum-core's API.
import { apiFetch, createIdempotencyKey } from './api-client';
import type { OrderTypeForPayment, PaymentIntent, WalletLink } from '../types/models';

export function linkWallet(stellarPublicKey: string, accessToken: string): Promise<WalletLink> {
  return apiFetch<WalletLink>('/payments/wallet-link', {
    method: 'POST',
    body: { stellarPublicKey },
    accessToken,
    // One key per user action; api-client reuses it across network retries.
    idempotencyKey: createIdempotencyKey(),
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
  return apiFetch<PaymentIntent>('/payments/intents', {
    method: 'POST',
    body: input,
    accessToken,
    idempotencyKey: createIdempotencyKey(),
  });
}

export function getPaymentIntent(id: string, accessToken: string): Promise<PaymentIntent> {
  return apiFetch<PaymentIntent>(`/payments/intents/${id}`, { accessToken });
}

export function fundPaymentIntent(id: string, accessToken: string): Promise<PaymentIntent> {
  return apiFetch<PaymentIntent>(`/payments/intents/${id}/fund`, {
    method: 'POST',
    accessToken,
    idempotencyKey: createIdempotencyKey(),
  });
}

export function releasePaymentIntent(id: string, accessToken: string): Promise<PaymentIntent> {
  return apiFetch<PaymentIntent>(`/payments/intents/${id}/release`, {
    method: 'POST',
    accessToken,
    idempotencyKey: createIdempotencyKey(),
  });
}

export function refundPaymentIntent(id: string, accessToken: string): Promise<PaymentIntent> {
  return apiFetch<PaymentIntent>(`/payments/intents/${id}/refund`, {
    method: 'POST',
    accessToken,
    idempotencyKey: createIdempotencyKey(),
  });
}
