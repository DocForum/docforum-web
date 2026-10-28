// Patient-facing payment history. The PaymentIntent shape these return is
// real (docforum-core Phase 5.5, its docs/adr/0004-custodial-payments-v1.md);
// the `mine` list/detail endpoints themselves are assumed against
// docforum-core#90, which has not landed — today core only exposes
// admin-only `/payments/intents...` routes. See ARCHITECTURE_ESSENTIALS.md
// "Known assumptions". No Stellar call happens here (hard rule 1).
import { apiFetch } from './api-client';
import type { PaymentHistoryEntry, PaymentHistoryPage } from '../types/models';

export function listPaymentHistory(cursor: string | undefined, accessToken: string, signal?: AbortSignal): Promise<PaymentHistoryPage> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  return apiFetch<PaymentHistoryPage>(`/payments/mine${query}`, { accessToken, signal });
}

export function getPaymentHistoryEntry(id: string, accessToken: string, signal?: AbortSignal): Promise<PaymentHistoryEntry> {
  return apiFetch<PaymentHistoryEntry>(`/payments/mine/${encodeURIComponent(id)}`, { accessToken, signal });
}
