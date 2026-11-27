// Doctor messaging inbox endpoints.
import { http } from 'msw';
import { db } from '../db';
import { PATIENT_PROFILE_ID } from '../fixtures';
import { notFound, paramId, respond } from '../helpers';
import type { DoctorMessageThread, Message, MessagePage, MessageThread } from '../../types/models';

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

  // One consultation thread (`/patient/messages/:threadId`,
  // `/doctor/messages/:threadId`). Without these the requests bypass the mock
  // and the screen never settles. Fake content only.
  http.get(
    '*/threads/:id',
    respond('json', ({ params }) => {
      const inbox = db.messageThreads.find((t) => t.id === paramId(params));
      if (!inbox) return notFound('message thread');
      const thread: MessageThread = {
        id: inbox.id,
        appointmentId: 'apt-demo-2',
        status: 'open',
        createdAt: '2026-10-17T09:00:00.000Z',
        updatedAt: inbox.lastMessageAt,
      };
      return thread;
    }),
  ),

  http.get(
    '*/threads/:id/messages',
    respond('json', ({ params }) => {
      const inbox = db.messageThreads.find((t) => t.id === paramId(params));
      if (!inbox) return notFound('message thread');
      const message: Message = {
        id: `${inbox.id}-msg-1`,
        threadId: inbox.id,
        senderProfileId: PATIENT_PROFILE_ID,
        body: inbox.lastPreview ?? 'Demo message (fake).',
        attachments: [],
        createdAt: inbox.lastMessageAt,
      };
      const page: MessagePage = { messages: [message], nextCursor: null };
      return page;
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
