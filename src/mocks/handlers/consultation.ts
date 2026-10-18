// Consultation note sign-off and addenda endpoints.
import { http } from 'msw';
import { db } from '../db';
import { conflict, notFound, paramId, respond } from '../helpers';
import type { ConsultationAddendum } from '../../types/models';

export const consultationHandlers = [
  http.get(
    '*/consultation-notes/:appointmentId',
    respond('json', ({ params }) => {
      const note = db.consultationNotes.find(
        (n) => n.appointmentId === paramId(params, 'appointmentId'),
      );
      if (!note) return notFound('consultation note');
      return note;
    }),
  ),

  http.post(
    '*/consultation-notes/:id/sign-off',
    respond('json', ({ params }) => {
      const note = db.consultationNotes.find((n) => n.id === paramId(params));
      if (!note) return notFound('consultation note');
      if (note.signedAt) return conflict('note is already signed off and immutable');
      note.signedAt = new Date().toISOString();
      note.signedBy = 'Dr. Demo Doctor (fake)';
      note.autoSignOffAt = null;
      return note;
    }),
  ),

  http.post(
    '*/consultation-notes/:id/addenda',
    respond('json', async ({ params, request }) => {
      const note = db.consultationNotes.find((n) => n.id === paramId(params));
      if (!note) return notFound('consultation note');
      const body = (await request.json().catch(() => ({}))) as { content?: string };
      if (!body.content) return conflict('addendum content is required');
      const addendum: ConsultationAddendum = {
        id: `cad-mock-${db.consultationNotes.length + 1}-${Date.now()}`,
        noteId: note.id,
        content: body.content,
        createdAt: new Date().toISOString(),
      };
      note.addenda = [...note.addenda, addendum];
      return addendum;
    }),
  ),
];
