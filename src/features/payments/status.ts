import { ApiError } from '../../services/api-client';
import type { Translator } from '../../i18n/useT';
import type { OrderTypeForPayment, PaymentIntentStatus } from '../../types/models';
import { englishTranslator } from '../../i18n/englishTranslator';

export const STATUS_LABEL: Record<PaymentIntentStatus, string> = {
  created: 'Not funded',
  awaiting_signature: 'Waiting for your signature',
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
  awaiting_signature:
    'A transaction was prepared for your wallet to sign. Nothing is on-chain until you sign and it is submitted — if it expires, preparing a new one is free and normal.',
  escrowed: 'DocForum is holding this money in escrow. The facility has not been paid yet — that is the protection escrow exists for.',
  released: 'The money was released to the facility. This payment is complete.',
  refunded: 'The money came back out of escrow and is no longer held for the facility.',
  failed: 'This payment failed. Nothing was moved on-chain.',
};

export function statusLabel(status: PaymentIntentStatus, t: Translator = englishTranslator): string {
  return t(`payments.status.${status}`, STATUS_LABEL[status] ?? 'Unknown status');
}

export function statusCopy(status: PaymentIntentStatus, t: Translator = englishTranslator): string {
  return t(`payments.statusCopy.${status}`, STATUS_COPY[status] ?? 'We cannot explain this status yet.');
}

export function orderTypeLabel(orderType: OrderTypeForPayment, t: Translator = englishTranslator): string {
  const isPrescription = orderType === 'prescription';
  return t(
    `payments.orderType.${isPrescription ? 'prescription' : 'labOrder'}`,
    isPrescription ? 'Prescription' : 'Lab order',
  );
}

export function formatDay(iso: string, formatDate?: (value: string) => string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return formatDate ? formatDate(iso) : date.toLocaleDateString();
}

/** An empty payment list and a list that could not be fetched are different
 * statements — the first is about the patient's money, the second about our
 * request. core#90 has not landed, so a 404 here is the normal case. */
export function historyErrorCopy(error: unknown, t: Translator = englishTranslator): string {
  if (error instanceof ApiError && error.status === 404) {
    return t('payments.history.unavailable', 'Your payment history is not available for this deployment yet.');
  }
  if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
    return t('payments.history.forbidden', 'Sign in again to view your payment history.');
  }
  if (error instanceof ApiError && error.message.trim()) return error.message;
  return t('payments.history.loadError', 'Your payment history could not be loaded. Try again shortly.');
}

/** `refundDeadlineAt` is assumed (docforum-core#90) — the real row has no such
 * column, so absence is normal and renders nothing rather than a guess. */
export function refundDeadlineCopy(
  deadline: string | null | undefined,
  now: Date,
  t: Translator = englishTranslator,
  formatDate?: (value: string) => string,
): string | null {
  if (!deadline) return null;
  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) return null;
  const day = formatDate ? formatDate(deadline) : date.toLocaleDateString();
  return date.getTime() < now.getTime()
    ? t('payments.refund.closed', 'The refund window closed on {date}.', { date: day })
    : t('payments.refund.open', 'This payment can still be refunded until {date}.', { date: day });
}
