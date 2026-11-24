// --- Phase W7 — Notification preferences and quiet hours (issue #108) -------
// Assumed shape pending docforum-core#99. Preferences are per notification
// type × channel; safety-critical types are server-locked and always on.
// See ARCHITECTURE_ESSENTIALS.md "Known assumptions — Phase W7".

export type NotificationChannel = 'email' | 'sms' | 'in_app';

export type NotificationType =
  | 'appointment_reminders'
  | 'appointment_changes'
  | 'new_message'
  | 'referral_updates'
  | 'order_updates'
  | 'payment_receipts'
  | 'marketing'
  | 'critical_lab_result'
  | 'security_alert';

export interface NotificationPreference {
  type: NotificationType;
  channel: NotificationChannel;
  enabled: boolean;
  /** Safety-critical rows can't be turned off, in the UI or the API. */
  locked: boolean;
  /** Why the row is locked; required when `locked` is true. */
  lockedReason?: string | null;
}

export interface QuietHours {
  enabled: boolean;
  /** Local wall-clock HH:MM in `timeZone`. */
  start: string;
  end: string;
  /** IANA zone the quiet-hours window is interpreted in. */
  timeZone: string;
}

export interface NotificationPreferences {
  preferences: NotificationPreference[];
  quietHours: QuietHours;
  updatedAt?: string;
}

export interface UpdateNotificationPreferencesInput {
  preferences?: Array<Pick<NotificationPreference, 'type' | 'channel' | 'enabled'>>;
  quietHours?: QuietHours;
}
