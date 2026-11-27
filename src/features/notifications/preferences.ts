import type { useT } from '../../i18n/useT';
import { getBrowserTimeZone } from '../../i18n/time-zone';
import type {
  NotificationChannel,
  NotificationPreferences,
  NotificationType,
  QuietHours,
  Role,
  UpdateNotificationPreferencesInput,
} from '../../types/models';

type T = ReturnType<typeof useT>;

export const NOTIFICATION_CHANNELS: NotificationChannel[] = ['email', 'sms', 'in_app'];

/** Channel names are catalogue copy, never built from the raw API id. */
export function channelLabel(channel: NotificationChannel, t: T): string {
  switch (channel) {
    case 'email':
      return t('notifications.channel.email', 'Email');
    case 'sms':
      return t('notifications.channel.sms', 'SMS');
    case 'in_app':
      return t('notifications.channel.inApp', 'In-app');
  }
}

export interface NotificationTypeMeta {
  type: NotificationType;
  /** Safety-critical notifications are always delivered and can't be
   * disabled by the user (issue #108). */
  locked: boolean;
}

export const NOTIFICATION_TYPES: NotificationTypeMeta[] = [
  { type: 'appointment_reminders', locked: false },
  { type: 'appointment_changes', locked: false },
  { type: 'new_message', locked: false },
  { type: 'referral_updates', locked: false },
  { type: 'order_updates', locked: false },
  { type: 'payment_receipts', locked: false },
  { type: 'marketing', locked: false },
  { type: 'critical_lab_result', locked: true },
  { type: 'security_alert', locked: true },
];

export interface NotificationTypeCopy {
  label: string;
  description: string;
  lockedReason?: string;
}

/** All type-level copy lives in the catalogue. Each API type id maps to its
 * own static `t()` call so no message id is ever assembled at runtime. */
export function notificationTypeCopy(type: NotificationType, t: T): NotificationTypeCopy {
  switch (type) {
    case 'appointment_reminders':
      return {
        label: t('notifications.type.appointmentReminders.label', 'Appointment reminders'),
        description: t(
          'notifications.type.appointmentReminders.description',
          'A reminder before an upcoming appointment.',
        ),
      };
    case 'appointment_changes':
      return {
        label: t('notifications.type.appointmentChanges.label', 'Appointment changes'),
        description: t(
          'notifications.type.appointmentChanges.description',
          'Reschedules, cancellations and check-in updates.',
        ),
      };
    case 'new_message':
      return {
        label: t('notifications.type.newMessage.label', 'New messages'),
        description: t(
          'notifications.type.newMessage.description',
          'A care-team or facility message thread has a new reply.',
        ),
      };
    case 'referral_updates':
      return {
        label: t('notifications.type.referralUpdates.label', 'Referral updates'),
        description: t(
          'notifications.type.referralUpdates.description',
          'A specialist referral is accepted, declined or completed.',
        ),
      };
    case 'order_updates':
      return {
        label: t('notifications.type.orderUpdates.label', 'Order updates'),
        description: t(
          'notifications.type.orderUpdates.description',
          'Prescriptions and lab orders are ready or ready for collection.',
        ),
      };
    case 'payment_receipts':
      return {
        label: t('notifications.type.paymentReceipts.label', 'Payment receipts'),
        description: t(
          'notifications.type.paymentReceipts.description',
          'Escrow funding, release and refund receipts.',
        ),
      };
    case 'marketing':
      return {
        label: t('notifications.type.marketing.label', 'Product news'),
        description: t(
          'notifications.type.marketing.description',
          'Optional DocForum product updates. Off unless you opt in.',
        ),
      };
    case 'critical_lab_result':
      return {
        label: t('notifications.type.criticalLab.label', 'Critical lab results'),
        description: t(
          'notifications.type.criticalLab.description',
          'A result that needs urgent attention.',
        ),
        lockedReason: t(
          'notifications.type.criticalLab.lockedReason',
          'Critical lab results are always delivered on every channel — a missed urgent result is a safety risk. You can change how other notifications reach you, but not these.',
        ),
      };
    case 'security_alert':
      return {
        label: t('notifications.type.security.label', 'Security alerts'),
        description: t(
          'notifications.type.security.description',
          'Sign-ins, password and account-security events.',
        ),
        lockedReason: t(
          'notifications.type.security.lockedReason',
          'Security alerts are always delivered so you can react to unauthorised access. They cannot be disabled.',
        ),
      };
  }
}

const TYPE_META = new Map(NOTIFICATION_TYPES.map((meta) => [meta.type, meta]));

export function notificationTypeMeta(type: NotificationType): NotificationTypeMeta {
  return TYPE_META.get(type) ?? NOTIFICATION_TYPES[0];
}

type RoleDefaults = Record<NotificationType, Record<NotificationChannel, boolean>>;

const ALL_ON: Record<NotificationChannel, boolean> = { email: true, sms: true, in_app: true };
const ALL_OFF: Record<NotificationChannel, boolean> = { email: false, sms: false, in_app: false };

const PATIENT_DEFAULTS: RoleDefaults = {
  appointment_reminders: { email: true, sms: true, in_app: true },
  appointment_changes: { email: true, sms: true, in_app: true },
  new_message: { email: false, sms: false, in_app: true },
  referral_updates: { email: true, sms: false, in_app: true },
  order_updates: { email: true, sms: true, in_app: true },
  payment_receipts: { email: true, sms: false, in_app: false },
  marketing: ALL_OFF,
  critical_lab_result: ALL_ON,
  security_alert: ALL_ON,
};

const DOCTOR_DEFAULTS: RoleDefaults = {
  appointment_reminders: { email: true, sms: false, in_app: true },
  appointment_changes: { email: true, sms: true, in_app: true },
  new_message: { email: true, sms: false, in_app: true },
  referral_updates: { email: true, sms: false, in_app: true },
  order_updates: { email: false, sms: false, in_app: true },
  payment_receipts: { email: true, sms: false, in_app: false },
  marketing: ALL_OFF,
  critical_lab_result: ALL_ON,
  security_alert: ALL_ON,
};

const FACILITY_DEFAULTS: RoleDefaults = {
  appointment_reminders: ALL_OFF,
  appointment_changes: { email: true, sms: false, in_app: false },
  new_message: { email: false, sms: false, in_app: true },
  referral_updates: { email: false, sms: false, in_app: true },
  order_updates: { email: true, sms: false, in_app: true },
  payment_receipts: { email: true, sms: false, in_app: false },
  marketing: ALL_OFF,
  critical_lab_result: ALL_ON,
  security_alert: ALL_ON,
};

const ADMIN_DEFAULTS: RoleDefaults = {
  appointment_reminders: ALL_OFF,
  appointment_changes: { email: true, sms: false, in_app: false },
  new_message: { email: false, sms: false, in_app: true },
  referral_updates: { email: false, sms: false, in_app: true },
  order_updates: { email: true, sms: false, in_app: true },
  payment_receipts: { email: true, sms: false, in_app: false },
  marketing: ALL_OFF,
  critical_lab_result: ALL_ON,
  security_alert: ALL_ON,
};

export const ROLE_DEFAULTS: Record<Role, RoleDefaults> = {
  patient: PATIENT_DEFAULTS,
  doctor: DOCTOR_DEFAULTS,
  facility: FACILITY_DEFAULTS,
  admin: ADMIN_DEFAULTS,
};

export function defaultQuietHours(): QuietHours {
  return {
    enabled: false,
    start: '21:00',
    end: '08:00',
    timeZone: getBrowserTimeZone(),
  };
}

export function defaultPreferencesForRole(role: Role): NotificationPreferences {
  return {
    preferences: NOTIFICATION_TYPES.flatMap((meta) =>
      NOTIFICATION_CHANNELS.map((channel) => ({
        type: meta.type,
        channel,
        enabled: ROLE_DEFAULTS[role][meta.type][channel],
        locked: meta.locked,
        // The stored reason is an opaque marker: the human-readable copy is
        // rendered from the catalogue by `notificationTypeCopy`.
        lockedReason: meta.locked ? meta.type : null,
      })),
    ),
    quietHours: defaultQuietHours(),
  };
}

/**
 * Merge a server response with role defaults so a missing type/channel still
 * has a deliberate value, and safety-critical rows are always on + locked.
 */
export function completePreferences(
  role: Role,
  stored: NotificationPreferences | null | undefined,
): NotificationPreferences {
  const defaults = defaultPreferencesForRole(role);
  const storedPrefs = new Map(
    (stored?.preferences ?? []).map((pref) => [`${pref.type}:${pref.channel}`, pref.enabled]),
  );

  return {
    preferences: defaults.preferences.map((pref) => {
      const meta = notificationTypeMeta(pref.type);
      const enabled = meta.locked ? true : storedPrefs.get(`${pref.type}:${pref.channel}`) ?? pref.enabled;
      return {
        ...pref,
        enabled,
        locked: meta.locked,
        lockedReason: meta.locked ? pref.type : null,
      };
    }),
    quietHours: stored?.quietHours ?? defaults.quietHours,
    updatedAt: stored?.updatedAt,
  };
}

/** Apply an optimistic partial update to a cached preference set. */
export function applyPreferencesUpdate(
  current: NotificationPreferences,
  input: UpdateNotificationPreferencesInput,
): NotificationPreferences {
  const next = new Map(
    (input.preferences ?? []).map((pref) => [`${pref.type}:${pref.channel}`, pref.enabled]),
  );

  return {
    ...current,
    preferences: current.preferences.map((pref) => {
      const meta = notificationTypeMeta(pref.type);
      if (meta.locked) return { ...pref, enabled: true };
      const requested = next.get(`${pref.type}:${pref.channel}`);
      return requested === undefined ? pref : { ...pref, enabled: requested };
    }),
    quietHours: input.quietHours ?? current.quietHours,
  };
}

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidClockTime(value: string): boolean {
  return TIME_PATTERN.test(value);
}

/** Validation returns an identifier, not copy — the form translates it. */
export type QuietHoursError = 'invalidTime' | 'sameTime';

export function validateQuietHours(quietHours: QuietHours): QuietHoursError | null {
  if (!isValidClockTime(quietHours.start) || !isValidClockTime(quietHours.end)) {
    return 'invalidTime';
  }
  if (quietHours.start === quietHours.end) {
    return 'sameTime';
  }
  return null;
}
