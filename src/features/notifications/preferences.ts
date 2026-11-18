import { getBrowserTimeZone } from '../../i18n/time-zone';
import type {
  NotificationChannel,
  NotificationPreferences,
  NotificationType,
  QuietHours,
  Role,
  UpdateNotificationPreferencesInput,
} from '../../types/models';

export const NOTIFICATION_CHANNELS: NotificationChannel[] = ['email', 'sms', 'in_app'];

export const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  email: 'Email',
  sms: 'SMS',
  in_app: 'In-app',
};

export interface NotificationTypeMeta {
  type: NotificationType;
  label: string;
  description: string;
  /** Safety-critical notifications are always delivered and can't be
   * disabled by the user (issue #108). */
  locked: boolean;
  lockedReason?: string;
}

export const NOTIFICATION_TYPES: NotificationTypeMeta[] = [
  {
    type: 'appointment_reminders',
    label: 'Appointment reminders',
    description: 'A reminder before an upcoming appointment.',
    locked: false,
  },
  {
    type: 'appointment_changes',
    label: 'Appointment changes',
    description: 'Reschedules, cancellations and check-in updates.',
    locked: false,
  },
  {
    type: 'new_message',
    label: 'New messages',
    description: 'A care-team or facility message thread has a new reply.',
    locked: false,
  },
  {
    type: 'referral_updates',
    label: 'Referral updates',
    description: 'A specialist referral is accepted, declined or completed.',
    locked: false,
  },
  {
    type: 'order_updates',
    label: 'Order updates',
    description: 'Prescriptions and lab orders are ready or ready for collection.',
    locked: false,
  },
  {
    type: 'payment_receipts',
    label: 'Payment receipts',
    description: 'Escrow funding, release and refund receipts.',
    locked: false,
  },
  {
    type: 'marketing',
    label: 'Product news',
    description: 'Optional DocForum product updates. Off unless you opt in.',
    locked: false,
  },
  {
    type: 'critical_lab_result',
    label: 'Critical lab results',
    description: 'A result that needs urgent attention.',
    locked: true,
    lockedReason:
      'Critical lab results are always delivered on every channel — a missed urgent result is a safety risk. You can change how other notifications reach you, but not these.',
  },
  {
    type: 'security_alert',
    label: 'Security alerts',
    description: 'Sign-ins, password and account-security events.',
    locked: true,
    lockedReason:
      'Security alerts are always delivered so you can react to unauthorised access. They cannot be disabled.',
  },
];

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
  order_updates: { email: false, sms: false, in_app: true },
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
        lockedReason: meta.lockedReason ?? null,
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
        lockedReason: meta.lockedReason ?? null,
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

export function validateQuietHours(quietHours: QuietHours): string | null {
  if (!isValidClockTime(quietHours.start) || !isValidClockTime(quietHours.end)) {
    return 'Quiet hours must use a valid 24-hour time.';
  }
  if (quietHours.start === quietHours.end) {
    return 'Quiet hours must start and end at different times.';
  }
  return null;
}
