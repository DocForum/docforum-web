import { ApiError } from '../../services/api-client';
import type { OrderTypeForPayment, PaymentIntentStatus } from '../../types/models';

export const STATUS_LABEL: Record<PaymentIntentStatus, string> = {
  created: 'Not funded',
  escrowed: 'Held in escrow',
  released: 'Released',
  refunded: 'Refunded',
  failed: 'Failed',
};

/** Sentences for the person who paid, not the enum token the contract uses.
 * Unknown values fall back rather than rendering a bare word — and never a
 * `undefined`. */
export const STATUS_COPY: Record<PaymentIntentStatus, string> = {
  created: 'This payment was set up but never funded. Nothing has left you and nothing is on-chain.',
  escrowed: 'DocForum is holding this money in escrow. The facility has not been paid yet — that is the protection escrow exists for.',
  released: 'The money was released to the facility. This payment is complete.',
  refunded: 'The money came back out of escrow and is no longer held for the facility.',
  failed: 'This payment failed. Nothing was moved on-chain.',
};

export function statusLabel(status: PaymentIntentStatus): string {
  return STATUS_LABEL[status] ?? 'Unknown status';
}

export function statusCopy(status: PaymentIntentStatus): string {
  return STATUS_COPY[status] ?? 'We cannot explain this status yet.';
}

export function orderTypeLabel(orderType: OrderTypeForPayment): string {
  return orderType === 'prescription' ? 'Prescription' : 'Lab order';
}

export function formatDay(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString();
}

/** An empty payment list and a list that could not be fetched are different
 * statements — the first is about the patient's money, the second about our
 * request. core#90 has not landed, so a 404 here is the normal case. */
export function historyErrorCopy(error: unknown): string {
  if (error instanceof ApiError && error.status === 404) {
    return 'Your payment history is not available for this deployment yet.';
  }
  if (error instanceof ApiError) return error.message;
  return 'Your payment history could not be loaded.';
}

/** `refundDeadlineAt` is assumed (docforum-core#90) — the real row has no such
 * column, so absence is normal and renders nothing rather than a guess. */
export function refundDeadlineCopy(deadline: string | null | undefined, now: Date): string | null {
  if (!deadline) return null;
  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) return null;
  const day = date.toLocaleDateString();
  return date.getTime() < now.getTime()
    ? `The refund window closed on ${day}.`
    : `This payment can still be refunded until ${day}.`;
}
