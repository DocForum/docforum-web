import { http } from 'msw';
import { db } from '../db';
import { notFound, paramId, respond } from '../helpers';

export const doctorTodayHandlers = [
  http.get(
    '*/appointments/:appointmentId/intake',
    respond('nullable', ({ params }) => {
      const intake = db.intakeForms.find(
        (form) => form.appointmentId === paramId(params, 'appointmentId'),
      );
      if (!intake) return notFound('intake form');
      return intake;
    }),
  ),
];
