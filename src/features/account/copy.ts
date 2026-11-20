import type { AccessActorRole, AccessReason, AccessRecordType } from '../../types/models';

export const ROLE_LABEL: Record<AccessActorRole, string> = {
  doctor: 'Clinician',
  facility: 'Facility',
  patient: 'You',
  admin: 'DocForum staff',
};

export const RECORD_LABEL: Record<AccessRecordType, string> = {
  health_profile: 'your health profile',
  appointment: 'an appointment',
  referral: 'a referral',
  order: 'an order',
  dependent: 'a dependent record',
};

export const REASON_COPY: Record<AccessReason, string> = {
  consultation: 'Opened while treating you at a visit.',
  order_fulfillment: 'Opened to carry out an order for you.',
  result_delivery: 'Opened to send you a result.',
  handover_claim: 'Opened while a record was being handed over.',
  support: 'Opened by DocForum staff while handling a request about your account.',
};

export const FILTER_OPTIONS: { value: AccessRecordType; label: string }[] = [
  { value: 'health_profile', label: 'Health profile' },
  { value: 'appointment', label: 'Appointments' },
  { value: 'referral', label: 'Referrals' },
  { value: 'order', label: 'Orders' },
  { value: 'dependent', label: 'Dependents' },
];

/** The log is written by docforum-core, which may add a reason before this
 * repo adds its sentence — an unknown value must not render "undefined" on a
 * privacy screen. */
export function roleLabel(role: AccessActorRole): string {
  return ROLE_LABEL[role] ?? 'Someone with access';
}

export function recordLabel(recordType: AccessRecordType): string {
  return RECORD_LABEL[recordType] ?? 'part of your record';
}

export function reasonCopy(reason: AccessReason): string {
  return REASON_COPY[reason] ?? 'Opened as part of your care.';
}

export function formatWhen(occurredAt: string): string {
  const date = new Date(occurredAt);
  return Number.isNaN(date.getTime()) ? occurredAt : date.toLocaleString();
}

/** No support mailbox is configured anywhere in this repo yet, so the
 * report-a-concern link is built from `VITE_SUPPORT_EMAIL` and simply is not
 * a link when that is unset — pointing patients at an address that does not
 * exist is worse than telling them the channel is not wired up. */
export function reportConcernHref(): string | null {
  const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL;
  if (!supportEmail) return null;
  const subject = 'Concern about access to my health record';
  return `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}`;
}
