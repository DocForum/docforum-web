// Notification preferences (issue #108): role-appropriate seeded defaults,
// locked safety-critical rows, and quiet hours. PATCH accepts either the
// changed rows or the quiet-hours window, mirroring the assumed contract.
import { http, HttpResponse } from 'msw';
import { db } from '../db';
import { completePreferences, notificationTypeMeta } from '../../features/notifications/preferences';
import { respond } from '../helpers';
import { useMockStore } from '../mock-store';
import type {
  NotificationPreferences,
  QuietHours,
  UpdateNotificationPreferencesInput,
} from '../../types/models';

function current(): NotificationPreferences {
  const role = useMockStore.getState().activeRole;
  return completePreferences(role, db.notificationPreferences[role]);
}

export const notificationHandlers = [
  http.get('*/notifications/preferences', respond('json', () => current())),

  http.patch(
    '*/notifications/preferences',
    respond('json', async ({ request }) => {
      const role = useMockStore.getState().activeRole;
      const body = (await request.json().catch(() => ({}))) as UpdateNotificationPreferencesInput;
      const previous = current();

      const preferences = previous.preferences.map((pref) => {
        const meta = notificationTypeMeta(pref.type);
        const change = body.preferences?.find(
          (candidate) => candidate.type === pref.type && candidate.channel === pref.channel,
        );
        if (!change) return pref;
        if (meta.locked && change.enabled === false) {
          return { ...pref, enabled: true };
        }
        return { ...pref, enabled: change.enabled };
      });

      const lockedAttempt = body.preferences?.some(
        (change) => !change.enabled && notificationTypeMeta(change.type).locked,
      );
      if (lockedAttempt) {
        return HttpResponse.json(
          {
            message:
              'Mock API: safety-critical notifications cannot be disabled (matching the server rule).',
          },
          { status: 422 },
        );
      }

      const quietHours: QuietHours = body.quietHours
        ? { ...body.quietHours }
        : previous.quietHours;

      const next: NotificationPreferences = {
        preferences,
        quietHours,
        updatedAt: new Date().toISOString(),
      };
      db.notificationPreferences[role] = next;
      return next;
    }),
  ),
];
