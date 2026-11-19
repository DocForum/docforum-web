import { ApiError } from '../../services/api-client';
import type { OrderTypeForPayment, PaymentIntentStatus } from '../../types/models';

type Translate = (
  id: string,
  defaultMessage: string,
  values?: Record<string, string | number | boolean | Date | null | undefined>,
) => string;

/** English fallbacks used when a caller has no translator (pure logic/tests). */
const identity: Translate = (_id, defaultMessage) => defaultMessage;

export const STATUS_LABEL: Record<PaymentIntentStatus, string> = {
  created: 'Not funded',
  awaiting_signature: 'Waiting for your signature',
  escrowed: 'Held in escrow',
  released: 'Released',
  refunded: 'Refunded',
  failed: 'Failed',
};

/** Explicit, per-status message ids — the raw API value is never rendered. */
export const STATUS_MESSAGE_ID: Record<PaymentIntentStatus, string> = {
  created: 'payments.status.created',
  awaiting_signature: 'payments.status.awaitingSignature',
  escrowed: 'payments.status.escrowed',
  released: 'payments.status.released',
  refunded: 'payments.status.refunded',
  failed: 'payments.status.failed',
};

/** Sentences for the person who paid, not the enum token the contract uses.
 * Unknown values fall back rather than rendering a bare word — and never a
 * `undefined`. */
export const STATUS_COPY: Record<PaymentIntentStatus, string> = {
  created: 'This payment was set up but never funded. Nothing has left you and nothing is on-chain.',
  awaiting_signature:
    'A transaction was prepared for your wallet to sign. Nothing is on-chain until you sign and it is submitted — if it expires, preparing a new one is free and normal.',
  escrowed: 'DocForum is holding this money in escrow. The facility has not been paid yet — that is the protection escrow exists for.',
  released: 'The money was released to the facility. This payment is complete.',
  refunded: 'The money came back out of escrow and is no longer held for the facility.',
  failed: 'This payment failed. Nothing was moved on-chain.',
};

export function statusLabel(status: PaymentIntentStatus, t: Translate = identity): string {
  // Explicit per-status keys: API identifiers are mapped, never rendered raw.
  switch (status) {
    case 'created':
      return t('payments.status.created', 'Not funded');
    case 'awaiting_signature':
      return t('payments.status.awaitingSignature', 'Waiting for your signature');
    case 'escrowed':
      return t('payments.status.escrowed', 'Held in escrow');
    case 'released':
      return t('payments.status.released', 'Released');
    case 'refunded':
      return t('payments.status.refunded', 'Refunded');
    case 'failed':
      return t('payments.status.failed', 'Failed');
    default:
      return t('payments.status.unknown', 'Unknown status');
  }
}

/**
 * The English catalogue carries one ICU `select` for every status, so a
 * locale can rewrite whole sentences; callers still receive a per-status
 * fallback for the pre-catalogue render.
 */
export function statusCopy(status: PaymentIntentStatus, t: Translate = identity): string {
  return t(
    'payments.status.copy',
    STATUS_COPY[status] ?? 'We cannot explain this status yet.',
    { status },
  );
}

export function orderTypeLabel(orderType: OrderTypeForPayment, t: Translate = identity): string {
  return orderType === 'prescription'
    ? t('payments.orderType.prescription', 'Prescription')
    : t('payments.orderType.labOrder', 'Lab order');
}

export function formatDay(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString();
}

/** An empty payment list and a list that could not be fetched are different
 * statements — the first is about the patient's money, the second about our
 * request. core#90 has not landed, so a 404 here is the normal case. */
export function historyErrorCopy(error: unknown, t: Translate = identity): string {
  if (error instanceof ApiError && error.status === 404) {
    return t(
      'payments.history.unavailable',
      'Your payment history is not available for this deployment yet.',
    );
  }
  if (error instanceof ApiError) return error.message;
  return t('payments.history.loadError', 'Your payment history could not be loaded.');
}

/** `refundDeadlineAt` is assumed (docforum-core#90) — the real row has no such
 * column, so absence is normal and renders nothing rather than a guess. */
export function refundDeadlineCopy(
  deadline: string | null | undefined,
  now: Date,
  t: Translate = identity,
): string | null {
  if (!deadline) return null;
  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) return null;
  const day = date.toLocaleDateString();
  return date.getTime() < now.getTime()
    ? t('payments.refund.closed', 'The refund window closed on {date}.', { date: day })
    : t('payments.refund.open', 'This payment can still be refunded until {date}.', { date: day });
}
