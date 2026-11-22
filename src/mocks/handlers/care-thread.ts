// Care thread timeline endpoints.
import { http } from 'msw';
import { db } from '../db';
import { notFound, paramId, respond } from '../helpers';

export const careThreadHandlers = [
  http.get(
    '*/patients/:profileId/care-threads',
    // Scoped to the acting profile: a guardian must never see a dependent's
    // thread under their own name, or vice versa (issue #295).
    respond('list', ({ params }) =>
      db.careThreads.filter((thread) => thread.patientProfileId === paramId(params, 'profileId')),
    ),
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
