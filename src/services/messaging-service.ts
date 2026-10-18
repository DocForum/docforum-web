import { apiFetch } from './api-client';
import type { MessageThread } from '../types/models';

export interface ListThreadsInput {
  filter?: 'all' | 'unread' | 'closing_soon';
  cursor?: string | null;
  limit?: number;
}

export interface ListThreadsResult {
  threads: MessageThread[];
  nextCursor: string | null;
}

export function listThreads(input: ListThreadsInput, accessToken: string): Promise<ListThreadsResult> {
  const params = new URLSearchParams();
  if (input.filter && input.filter !== 'all') params.set('filter', input.filter);
  if (input.cursor) params.set('cursor', input.cursor);
  if (input.limit) params.set('limit', String(input.limit));
  const qs = params.toString() ? `?${params.toString()}` : '';
  return apiFetch<ListThreadsResult>(`/doctor/messages/threads${qs}`, { accessToken });
}

export function markThreadRead(threadId: string, accessToken: string): Promise<void> {
  return apiFetch<void>(`/message-threads/${threadId}/read`, { method: 'POST', accessToken });
}

export function totalUnread(threads: MessageThread[]): number {
  return threads.reduce((sum, t) => sum + t.unreadCount, 0);
}
