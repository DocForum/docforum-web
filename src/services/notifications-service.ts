// In-app notification inbox (issue #107). All calls go through `api-client`,
// so timeouts, cancellation and the `{ message }` error envelope behave like
// every other feature (hard rule 1: docforum-core is the only backend).
//
// The contract is ASSUMED — docforum-core#93 (Notification model, dispatch
// interface and inbox API) has not landed. See ARCHITECTURE_ESSENTIALS.md
// "Known assumptions — Notification centre".
import { apiFetch } from './api-client';
import type {
  Notification,
  NotificationPage,
  NotificationStreamTicket,
} from '../types/models';

/** Page size for the inbox. Small enough for a dropdown, large enough that a
 * full page rarely needs a second request. */
export const NOTIFICATIONS_PAGE_SIZE = 20;

export interface ListNotificationsInput {
  /** Opaque cursor from the previous page; omit for the newest page. */
  cursor?: string | null;
  limit?: number;
}

/** `GET /notifications?cursor=&limit=` → one page, newest first. */
export function listNotifications(
  input: ListNotificationsInput,
  accessToken: string,
  signal?: AbortSignal,
): Promise<NotificationPage> {
  const params = new URLSearchParams();
  if (input.cursor) params.set('cursor', input.cursor);
  params.set('limit', String(input.limit ?? NOTIFICATIONS_PAGE_SIZE));
  return apiFetch<NotificationPage>(`/notifications?${params.toString()}`, {
    accessToken,
    signal,
  });
}

/** `POST /notifications/:id/read` → the updated notification. */
export function markNotificationRead(
  notificationId: string,
  accessToken: string,
): Promise<Notification> {
  return apiFetch<Notification>(`/notifications/${encodeURIComponent(notificationId)}/read`, {
    method: 'POST',
    accessToken,
  });
}

export interface MarkAllReadResult {
  updated: number;
  unreadCount: number;
}

/** `POST /notifications/read-all` → how many were marked. */
export function markAllNotificationsRead(accessToken: string): Promise<MarkAllReadResult> {
  return apiFetch<MarkAllReadResult>('/notifications/read-all', {
    method: 'POST',
    accessToken,
  });
}

/**
 * `GET /notifications/stream-ticket` → a short-lived ticket for the SSE
 * stream. The access token is deliberately NOT put in the stream URL:
 * `EventSource` cannot set headers, and a bearer token in a URL ends up in
 * logs, history and Referer headers. The ticket is single-use and expires in
 * under a minute.
 */
export function getNotificationStreamTicket(
  accessToken: string,
  signal?: AbortSignal,
): Promise<NotificationStreamTicket> {
  return apiFetch<NotificationStreamTicket>('/notifications/stream-ticket', {
    accessToken,
    signal,
  });
}
