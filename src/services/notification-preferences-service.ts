import { apiFetch } from './api-client';
import type {
  NotificationPreferences,
  UpdateNotificationPreferencesInput,
} from '../types/models';

/**
 * Assumed contract pending docforum-core#99: the API stores and returns the
 * complete type × channel matrix plus quiet hours. Safety-critical rows are
 * locked server-side too, not just in this UI.
 */
export function getNotificationPreferences(
  accessToken: string,
  signal?: AbortSignal,
): Promise<NotificationPreferences> {
  return apiFetch<NotificationPreferences>('/notifications/preferences', { accessToken, signal });
}

/** Saves only the changed rows (one toggle, or the quiet-hours window). */
export function updateNotificationPreferences(
  input: UpdateNotificationPreferencesInput,
  accessToken: string,
): Promise<NotificationPreferences> {
  return apiFetch<NotificationPreferences>('/notifications/preferences', {
    method: 'PATCH',
    body: input,
    accessToken,
  });
}
