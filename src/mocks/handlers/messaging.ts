// Doctor messaging inbox endpoints.
import { http } from 'msw';
import { db } from '../db';
import { notFound, paramId, respond } from '../helpers';
import type { DoctorMessageThread } from '../../types/models';

export const messagingHandlers = [
  http.get(
    '*/doctor/messages/threads',
    respond('list', ({ request }) => {
      const url = new URL(request.url);
      const filter = url.searchParams.get('filter');
      let threads: DoctorMessageThread[] = [...db.messageThreads];
      if (filter === 'unread') threads = threads.filter((t) => t.unreadCount > 0);
      if (filter === 'closing_soon') threads = threads.filter((t) => t.closingSoon);
      // Assumed contract: oldest unanswered first.
      threads.sort((a, b) => a.lastMessageAt.localeCompare(b.lastMessageAt));
      return { threads, nextCursor: null };
    }),
  ),

  http.post(
    '*/message-threads/:id/read',
    respond('void', ({ params }) => {
      const thread = db.messageThreads.find((t) => t.id === paramId(params));
      if (!thread) return notFound('message thread');
      thread.unreadCount = 0;
      return null;
    }),
  ),
];
