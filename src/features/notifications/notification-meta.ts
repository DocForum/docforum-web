// Notification kinds → destination and icon (issue #107).
//
// Two rules drive this file:
//  1. Every known kind maps to a deep link the recipient can act on, chosen by
//     role, so a doctor's "referral created" lands on the doctor queue and a
//     patient's lands on their care hub.
//  2. Unknown kinds render generically — a bell icon and, when the payload
//     carries a safe app-relative link, that link. This app ships ahead of
//     docforum-core's dispatch provider (docforum-core#93), so new kinds will
//     arrive before the UI knows them.
import type { Notification, Role } from '../../types/models';

export type NotificationCategory =
  | 'appointment'
  | 'referral'
  | 'order'
  | 'result'
  | 'payment'
  | 'message'
  | 'dispute'
  | 'other';

export interface NotificationMeta {
  category: NotificationCategory;
  /** Short, human label used for the row's category chip. */
  label: string;
}

const META: Record<string, NotificationMeta> = {
  appointment_booked: { category: 'appointment', label: 'Appointment' },
  appointment_reminder: { category: 'appointment', label: 'Appointment' },
  appointment_cancelled: { category: 'appointment', label: 'Appointment' },
  referral_created: { category: 'referral', label: 'Referral' },
  referral_accepted: { category: 'referral', label: 'Referral' },
  order_issued: { category: 'order', label: 'Order' },
  order_fulfilled: { category: 'order', label: 'Order' },
  order_rejected: { category: 'order', label: 'Order' },
  result_ready: { category: 'result', label: 'Result' },
  payment_due: { category: 'payment', label: 'Payment' },
  payment_escrowed: { category: 'payment', label: 'Payment' },
  payment_released: { category: 'payment', label: 'Payment' },
  payment_refunded: { category: 'payment', label: 'Payment' },
  message_received: { category: 'message', label: 'Message' },
  dispute_opened: { category: 'dispute', label: 'Dispute' },
  dispute_resolved: { category: 'dispute', label: 'Dispute' },
};

const UNKNOWN_META: NotificationMeta = { category: 'other', label: 'Update' };

export function notificationMeta(kind: string): NotificationMeta {
  return META[kind] ?? UNKNOWN_META;
}

/** Fallback destination per category and role, used when the payload has no
 * `link` (or when the kind is unknown and carries none either). */
const FALLBACKS: Record<NotificationCategory, Partial<Record<Role, string>>> = {
  appointment: {
    patient: '/patient/appointments',
    doctor: '/doctor',
    facility: '/facility',
    admin: '/admin',
  },
  referral: {
    patient: '/care',
    doctor: '/doctor',
    facility: '/facility',
    admin: '/admin/referrals',
  },
  order: {
    patient: '/patient/orders',
    doctor: '/doctor',
    facility: '/facility',
    admin: '/admin',
  },
  result: {
    patient: '/patient/records',
    doctor: '/doctor',
    facility: '/facility',
    admin: '/admin',
  },
  payment: {
    patient: '/payments',
    doctor: '/doctor',
    facility: '/facility/payments',
    admin: '/admin',
  },
  message: {
    patient: '/care',
    doctor: '/doctor/messages',
    facility: '/facility',
    admin: '/admin',
  },
  dispute: {
    patient: '/patient/orders',
    doctor: '/doctor',
    facility: '/facility/payments',
    admin: '/admin/disputes',
  },
  other: {},
};

/**
 * Only app-relative paths are ever rendered as links. A protocol-relative
 * (`//evil.test`) or absolute (`https://…`) target is rejected, so a hostile or
 * buggy payload can never turn a notification into an open redirect.
 */
export function safeAppPath(link: string | null | undefined): string | null {
  if (!link) return null;
  const trimmed = link.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return null;
  if (trimmed.includes('\\') || trimmed.includes('://')) return null;
  // Backstop against scheme tricks (`/redirect?to=...` is still same-origin and
  // harmless, but an embedded scheme is not).
  if (/^\/\s*[a-z][a-z0-9+.-]*:/i.test(trimmed)) return null;
  return trimmed;
}

/**
 * Where a notification should take the recipient.
 * - Known kind: the payload's own link wins (it points at the exact record),
 *   otherwise the role-aware destination for that category.
 * - Unknown kind: the payload link if it is safe, otherwise nothing — better a
 *   readable row than a link to a guess.
 */
export function notificationDestination(
  notification: Pick<Notification, 'kind' | 'link'>,
  role: Role | null,
): string | null {
  const meta = META[notification.kind];
  const payloadLink = safeAppPath(notification.link);

  if (meta) return payloadLink ?? (role ? FALLBACKS[meta.category][role] ?? null : null);
  return payloadLink;
}
