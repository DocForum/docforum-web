// Admin closures mock handlers (closure calendar management — the admin
// `/admin/closures` screen). List/create/update/delete plus the
// affected-appointments preview the admin UI shows before/after saving.
import { http, HttpResponse } from 'msw';
import { db } from '../db';
import { conflict, notFound, paramId, respond } from '../helpers';
import type {
  AffectedAppointment,
  Closure,
  CreateClosureInput,
  UpdateClosureInput,
} from '../../types/models';

/** Statuses that still represent a booked visit a closure would move. */
const BOOKED_STATUSES = new Set(['scheduled', 'checked_in']);

/**
 * Booked appointments overlapping a closure's window. Fixture appointments
 * carry no facilityId, so facility-scoped closures can't be narrowed further
 * here — a real docforum-core would filter by facility.
 */
function affectedAppointments(closure: Closure): AffectedAppointment[] {
  const from = Date.parse(closure.start);
  const to = Date.parse(closure.end);
  return db.appointments
    .filter((a) => BOOKED_STATUSES.has(a.status))
    .filter((a) => Date.parse(a.startsAt) < to && Date.parse(a.endsAt) > from)
    .map((a) => ({
      id: `aff-${a.id}`,
      appointmentId: a.id,
      patientProfileId: a.patientProfileId,
      patientName: a.patientName,
      startsAt: a.startsAt,
      endsAt: a.endsAt,
      status: a.status,
      reason: a.reason ?? null,
    }));
}

export const adminClosuresHandlers = [
  // GET /admin/closures — list, optionally scoped to one facility.
  http.get(
    '*/admin/closures',
    respond('list', ({ request }) => {
      const facilityId = new URL(request.url).searchParams.get('facilityId');
      if (!facilityId) return db.closures;
      return db.closures.filter((c) => (c.facilityId ?? null) === facilityId);
    }),
  ),

  // POST /admin/closures — create.
  http.post(
    '*/admin/closures',
    respond('json', async ({ request }) => {
      const body = (await request.json().catch(() => ({}))) as CreateClosureInput;
      if (!body.name?.trim()) return conflict('name is required');
      if (!body.start || !body.end) return conflict('start and end are required');
      const now = new Date().toISOString();
      const closure: Closure = {
        id: `clo-mock-${Date.now().toString(36)}`,
        name: body.name.trim(),
        description: body.description ?? null,
        status: body.status ?? 'active',
        allDay: body.allDay ?? false,
        start: body.start,
        end: body.end,
        facilityId: body.facilityId ?? null,
        createdAt: now,
        updatedAt: now,
      };
      db.closures.push(closure);
      return closure;
    }),
  ),

  // PATCH /admin/closures/:id — partial update.
  http.patch(
    '*/admin/closures/:id',
    respond('json', async ({ params, request }) => {
      const closure = db.closures.find((c) => c.id === paramId(params));
      if (!closure) return notFound('closure');
      const body = (await request.json().catch(() => ({}))) as UpdateClosureInput;
      if (body.name !== undefined) closure.name = body.name;
      if (body.description !== undefined) closure.description = body.description;
      if (body.status !== undefined) closure.status = body.status;
      if (body.allDay !== undefined) closure.allDay = body.allDay;
      if (body.start !== undefined) closure.start = body.start;
      if (body.end !== undefined) closure.end = body.end;
      if (body.facilityId !== undefined) closure.facilityId = body.facilityId;
      closure.updatedAt = new Date().toISOString();
      return closure;
    }),
  ),

  // DELETE /admin/closures/:id — remove.
  http.delete(
    '*/admin/closures/:id',
    respond('void', ({ params }) => {
      const id = paramId(params);
      if (!db.closures.some((c) => c.id === id)) return notFound('closure');
      db.closures = db.closures.filter((c) => c.id !== id);
      return new HttpResponse(null, { status: 204 });
    }),
  ),

  // GET /admin/closures/:id/affected-appointments — preview of booked
  // appointments inside the closure window (before/after saving).
  http.get(
    '*/admin/closures/:id/affected-appointments',
    respond('list', ({ params }) => {
      const closure = db.closures.find((c) => c.id === paramId(params));
      if (!closure) return notFound('closure');
      return affectedAppointments(closure);
    }),
  ),
];
