// Health profile entries per section.
import { http } from 'msw';
import { db } from '../db';
import { notFound, paramId, respond } from '../helpers';
import type { HealthEntry, HealthEntryInput } from '../../types/models';

const SECTIONS = ['allergies', 'conditions', 'medications'];

export const healthProfileHandlers = [
  http.get(
    '*/patients/:profileId/health/:section',
    respond('list', ({ params }) => {
      const profileId = paramId(params, 'profileId');
      const section = paramId(params, 'section');
      if (!SECTIONS.includes(section)) return notFound('health section');
      return db.healthEntries.filter(
        (e) => e.patientProfileId === profileId && e.section === section,
      );
    }),
  ),

  http.post(
    '*/patients/:profileId/health',
    respond('json', async ({ params, request }) => {
      const profileId = paramId(params, 'profileId');
      const body = (await request.json().catch(() => ({}))) as HealthEntryInput;
      const now = new Date().toISOString();
      const entry: HealthEntry = {
        id: `hev-mock-${Date.now()}`,
        patientProfileId: profileId,
        section: body.section ?? 'allergies',
        name: body.name ?? 'Unnamed (fake)',
        details: body.details,
        version: 1,
        updatedAt: now,
        createdAt: now,
      };
      db.healthEntries.push(entry);
      return entry;
    }),
  ),

  http.patch(
    '*/patients/:profileId/health/:entryId',
    respond('json', async ({ params, request }) => {
      const entry = db.healthEntries.find((e) => e.id === paramId(params, 'entryId'));
      if (!entry) return notFound('health entry');
      const body = (await request.json().catch(() => ({}))) as {
        name?: string;
        details?: string;
      };
      entry.previousValue = entry.name;
      if (body.name !== undefined) entry.name = body.name;
      if (body.details !== undefined) entry.details = body.details;
      entry.version += 1;
      entry.updatedAt = new Date().toISOString();
      return entry;
    }),
  ),

  http.delete(
    '*/patients/:profileId/health/:entryId',
    respond('void', ({ params }) => {
      const id = paramId(params, 'entryId');
      db.healthEntries = db.healthEntries.filter((e) => e.id !== id);
      return null;
    }),
  ),
];
