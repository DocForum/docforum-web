import { describe, expect, it } from 'vitest';
import {
  applyPreferencesUpdate,
  completePreferences,
  defaultPreferencesForRole,
  NOTIFICATION_TYPES,
  validateQuietHours,
} from './preferences';
import type { NotificationPreferences } from '../../types/models';

describe('notification preference defaults', () => {
  it('uses role-appropriate defaults for patients, doctors and facilities', () => {
    const patient = defaultPreferencesForRole('patient');
    const doctor = defaultPreferencesForRole('doctor');
    const facility = defaultPreferencesForRole('facility');

    const enabled = (prefs: NotificationPreferences, type: string, channel: string) =>
      prefs.preferences.find((pref) => pref.type === type && pref.channel === channel)?.enabled;

    expect(enabled(patient, 'appointment_reminders', 'sms')).toBe(true);
    expect(enabled(doctor, 'appointment_reminders', 'sms')).toBe(false);
    expect(enabled(doctor, 'new_message', 'email')).toBe(true);
    expect(enabled(facility, 'order_updates', 'sms')).toBe(false);
    expect(enabled(patient, 'marketing', 'email')).toBe(false);
  });

  it('locks safety-critical types on every channel, whatever the stored state', () => {
    const lockedTypes = NOTIFICATION_TYPES.filter((meta) => meta.locked).map((meta) => meta.type);
    const stored: NotificationPreferences = {
      preferences: lockedTypes.flatMap((type) =>
        (['email', 'sms', 'in_app'] as const).map((channel) => ({
          type,
          channel,
          enabled: false,
          locked: false,
        })),
      ),
      quietHours: { enabled: false, start: '21:00', end: '08:00', timeZone: 'UTC' },
    };

    const completed = completePreferences('patient', stored);
    const locked = completed.preferences.filter((pref) => pref.locked);

    expect(locked.length).toBe(lockedTypes.length * 3);
    expect(locked.every((pref) => pref.enabled)).toBe(true);
    expect(locked.every((pref) => Boolean(pref.lockedReason))).toBe(true);
  });

  it('fills missing server rows from role defaults and keeps explicit choices', () => {
    const stored: NotificationPreferences = {
      preferences: [
        { type: 'appointment_reminders', channel: 'email', enabled: false, locked: false },
      ],
      quietHours: { enabled: true, start: '22:00', end: '07:00', timeZone: 'Europe/London' },
    };

    const completed = completePreferences('patient', stored);
    expect(
      completed.preferences.find(
        (pref) => pref.type === 'appointment_reminders' && pref.channel === 'email',
      )?.enabled,
    ).toBe(false);
    expect(
      completed.preferences.find(
        (pref) => pref.type === 'appointment_reminders' && pref.channel === 'sms',
      )?.enabled,
    ).toBe(true);
    expect(completed.quietHours.timeZone).toBe('Europe/London');
  });
});

describe('applyPreferencesUpdate', () => {
  it('applies only the changed cell and never unlocks a locked row', () => {
    const base = defaultPreferencesForRole('patient');
    const next = applyPreferencesUpdate(base, {
      preferences: [
        { type: 'appointment_reminders', channel: 'email', enabled: false },
        { type: 'critical_lab_result', channel: 'email', enabled: false },
      ],
    });

    expect(
      next.preferences.find(
        (pref) => pref.type === 'appointment_reminders' && pref.channel === 'email',
      )?.enabled,
    ).toBe(false);
    expect(
      next.preferences.find(
        (pref) => pref.type === 'critical_lab_result' && pref.channel === 'email',
      )?.enabled,
    ).toBe(true);
  });
});

describe('validateQuietHours', () => {
  it('rejects equal start and end times but allows a window crossing midnight', () => {
    const base = { enabled: true, start: '21:00', end: '08:00', timeZone: 'UTC' };
    expect(validateQuietHours(base)).toBeNull();
    expect(validateQuietHours({ ...base, end: '21:00' })).toMatch(/different times/);
  });
});
