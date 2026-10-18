// Care thread timeline endpoints.
import { http } from 'msw';
import { db } from '../db';
import { notFound, paramId, respond } from '../helpers';

export const careThreadHandlers = [
  http.get(
    '*/patients/:profileId/care-threads',
    respond('list', () => db.careThreads),
  ),

  http.get(
    '*/care-threads/:id',
    respond('json', ({ params }) => {
      const thread = db.careThreads.find((t) => t.id === paramId(params));
      if (!thread) return notFound('care thread');
      return thread;
    }),
  ),
];
