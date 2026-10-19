import type { Schemas } from '@docforum/api-client';
import { api } from './api-client';

export interface ListThreadsInput {
  filter?: 'all' | 'unread' | 'closing_soon';
  cursor?: string | null;
  limit?: number;
}

export type ListThreadsResult = Schemas['ListThreadsResult'];

export function listThreads(input: ListThreadsInput, accessToken: string): Promise<ListThreadsResult> {
  return api.messaging.listThreads(input, { accessToken });
}

export function markThreadRead(threadId: string, accessToken: string): Promise<void> {
  return api.messaging.markThreadRead(threadId, { accessToken });
}

export function totalUnread(threads: Schemas['MessageThread'][]): number {
  return threads.reduce((sum, t) => sum + t.unreadCount, 0);
}
