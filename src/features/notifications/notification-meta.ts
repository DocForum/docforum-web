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
import type { useT } from '../../i18n/useT';
import type { Notification, Role } from '../../types/models';
import { paths } from '../../routes/paths';

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

type T = ReturnType<typeof useT>;

/** Identity translator: keeps pure callers and unit tests rendering the
 * English source copy when no `IntlProvider` is in scope. */
const english: T = (_id, defaultMessage) => defaultMessage;

/** Category chips are UI copy, so every label is a static catalogue call —
 * never a dynamically built message id. */
export function notificationCategoryLabel(category: NotificationCategory, t: T): string {
  switch (category) {
    case 'appointment':
      return t('notifications.category.appointment', 'Appointment');
    case 'referral':
      return t('notifications.category.referral', 'Referral');
    case 'order':
      return t('notifications.category.order', 'Order');
    case 'result':
      return t('notifications.category.result', 'Result');
    case 'payment':
      return t('notifications.category.payment', 'Payment');
    case 'message':
      return t('notifications.category.message', 'Message');
    case 'dispute':
      return t('notifications.category.dispute', 'Dispute');
    default:
      return t('notifications.category.other', 'Update');
  }
}

const META: Record<string, NotificationCategory> = {
  appointment_booked: 'appointment',
  appointment_reminder: 'appointment',
  appointment_cancelled: 'appointment',
  referral_created: 'referral',
  referral_accepted: 'referral',
  order_issued: 'order',
  order_fulfilled: 'order',
  order_rejected: 'order',
  result_ready: 'result',
  payment_due: 'payment',
  payment_escrowed: 'payment',
  payment_released: 'payment',
  payment_refunded: 'payment',
  message_received: 'message',
  dispute_opened: 'dispute',
  dispute_resolved: 'dispute',
};

/** Fallback destination per category and role, used when the payload has no
 * `link` (or when the kind is unknown and carries none either). */
const FALLBACKS: Record<NotificationCategory, Partial<Record<Role, string>>> = {
  appointment: {
    // Appointment detail needs an id, so without a payload link the care
    // hub is the closest the patient can act on.
    patient: paths.patient.root,
    doctor: paths.doctor.root,
    facility: paths.facility.root,
    admin: paths.admin.root,
  },
  referral: {
    patient: paths.care,
    doctor: paths.doctor.root,
    facility: paths.facility.root,
    admin: paths.admin.referrals,
  },
  order: {
    patient: paths.patient.orders,
    doctor: paths.doctor.root,
    facility: paths.facility.root,
    admin: paths.admin.root,
  },
  result: {
    patient: paths.patient.root,
    doctor: paths.doctor.root,
    facility: paths.facility.root,
    admin: paths.admin.root,
  },
  payment: {
    patient: paths.payments,
    doctor: paths.doctor.root,
    facility: paths.facility.payments,
    admin: paths.admin.root,
  },
  message: {
    patient: paths.care,
    doctor: paths.doctor.messages,
    facility: paths.facility.root,
    admin: paths.admin.root,
  },
  dispute: {
    patient: paths.patient.orders,
    doctor: paths.doctor.root,
    facility: paths.facility.payments,
    admin: paths.admin.disputes,
  },
  other: {},
};

export function notificationMeta(kind: string, t: T = english): NotificationMeta {
  const category = META[kind] ?? 'other';
  return { category, label: notificationCategoryLabel(category, t) };
}

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
  const category = META[notification.kind];
  const payloadLink = safeAppPath(notification.link);

  if (category) return payloadLink ?? (role ? FALLBACKS[category][role] ?? null : null);
  return payloadLink;
}
