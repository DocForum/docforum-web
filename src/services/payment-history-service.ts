// Patient-facing payment history. The PaymentIntent shape these return is
// real (docforum-core Phase 5.5, its docs/adr/0004-custodial-payments-v1.md);
// the `mine` list/detail endpoints themselves are assumed against
// docforum-core#90, which has not landed — today core only exposes
// admin-only `/payments/intents...` routes. See ARCHITECTURE_ESSENTIALS.md
// "Known assumptions". No Stellar call happens here (hard rule 1).
import { apiFetch } from './api-client';
import type { PaymentHistoryEntry, PaymentHistoryPage } from '../types/models';

export interface PaymentHistoryFilters {
  status?: string;
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string;
}

export function listPaymentHistory(
  params: string | PaymentHistoryFilters | undefined,
  accessToken: string,
  signal?: AbortSignal,
): Promise<PaymentHistoryPage> {
  const options: PaymentHistoryFilters = typeof params === 'string' ? { cursor: params } : (params ?? {});
  const query = new URLSearchParams();
  if (options.cursor) query.set('cursor', options.cursor);
  if (options.status && options.status !== 'all') query.set('status', options.status);
  if (options.from) query.set('from', options.from);
  if (options.to) query.set('to', options.to);
  if (options.limit !== undefined) query.set('limit', String(options.limit));
  const qs = query.toString() ? `?${query.toString()}` : '';

  return apiFetch<{ intents?: PaymentHistoryEntry[]; items?: PaymentHistoryEntry[]; nextCursor?: string | null }>(
    `/payments/mine${qs}`,
    { accessToken, signal },
  ).then((res) => ({
    intents: res.intents ?? res.items ?? [],
    nextCursor: res.nextCursor ?? null,
  }));
}

export async function fetchAllPaymentHistory(
  filters: Omit<PaymentHistoryFilters, 'cursor' | 'limit'> | undefined,
  accessToken: string,
  onProgress?: (loadedCount: number) => void,
  signal?: AbortSignal,
): Promise<PaymentHistoryEntry[]> {
  const allEntries: PaymentHistoryEntry[] = [];
  let cursor: string | undefined = undefined;

  do {
    const page = await listPaymentHistory(
      { ...filters, cursor, limit: 100 },
      accessToken,
      signal,
    );
    allEntries.push(...page.intents);
    onProgress?.(allEntries.length);
    cursor = page.nextCursor ?? undefined;
  } while (cursor && (!signal || !signal.aborted));

  return allEntries;
}

export function getPaymentHistoryEntry(id: string, accessToken: string, signal?: AbortSignal): Promise<PaymentHistoryEntry> {
  return apiFetch<PaymentHistoryEntry>(`/payments/intents/${encodeURIComponent(id)}`, { accessToken, signal });
}
