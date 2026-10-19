// Admin closures mock handlers (issue #__)

import type { Closure, CreateClosureInput, UpdateClosureInput, AffectedAppointment } from '../../types/models';

// --- Closure fixtures --------------------------------------------------------

export const MOCK_CLOSURES: Closure[] = [
  {
    id: 'clo-holiday-new-year',
    name: 'New Year Holiday',
    description: 'Year-end holiday closure',
    status: 'active',
    allDay: true,
    start: '2026-12-24T00:00:00.000Z',
    end: '2026-12-26T23:59:59.999Z',
    facilityId: null, // platform-wide
    createdAt: '2026-10-18T09:00:00.000Z',
    updatedAt: '2026-10-18T09:00:00.000Z',
  },
  {
    id: 'clo-maintenance-pharmacy',
    name: 'Pharmacy Maintenance',
    description: 'Quarterly equipment maintenance',
    status: 'active',
    allDay: false,
    start: '2026-11-01T09:00:00.000Z',
    end: '2026-11-01T17:00:00.000Z',
    facilityId: 'fac-demo-pharmacy', // scoped to pharmacy
    createdAt: '2026-10-18T09:00:00.000Z',
    updatedAt: '2026-10-18T09:00:00.000Z',
  },
];

// --- Mock DB integration -----------------------------------------------------

export function createMockClosuresDb(db: any) {
  db.closures = MOCK_CLOSURES;
}

// --- Handler definitions -----------------------------------------------------

export const adminClosuresHandlers = [
  // GET /admin/closures - list closures
  {
    method: 'GET',
    path: '/admin/closures',
    handler: async (req: { method: string; path: string }, res: { json: (body: any) => void; status: (code: number) => void }, ctx: { mock: any }) => {
      const closures = ctx.mock?.closures ?? MOCK_CLOSURES;
      return res.json(closures);
    },
  },

  // POST /admin/closures - create closure
  {
    method: 'POST',
    path: '/admin/closures',
    handler: async (req: { method: string; body: any }, res: { json: (body: any) => void }, ctx: { mock: any }) => {
      const body = req.body as CreateClosureInput;
      const closure: Closure = {
        id: `clo-${Date.now().toString(36)}`,
        name: body.name,
        description: body.description ?? null,
        status: body.status ?? 'active',
        allDay: body.allDay,
        start: body.start,
        end: body.end,
        facilityId: body.facilityId ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      // In a real setup, we'd add to the mock DB. For now, just return it.
      return res.json(closure);
    },
  },

  // PATCH /admin/closures/:id - update closure
  {
    method: 'PATCH',
    path: '/admin/closures/:id',
    handler: async (req: { method: string; body: any }, res: { json: (body: any) => void }, ctx: { mock: any }) => {
      const id = req.params?.id;
      const body = req.body as UpdateClosureInput;
      const closure: Closure = {
        id,
        name: body.name,
        description: body.description ?? null,
        status: body.status,
        allDay: body.allDay ?? true,
        start: body.start ?? '',
        end: body.end ?? '',
        facilityId: body.facilityId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return res.json(closure);
    },
  },

  // DELETE /admin/closures/:id - delete closure
  {
    method: 'DELETE',
    path: '/admin/closures/:id',
    handler: async (req: { method: string }, res: { status: (code: number) => void }, ctx: { mock: any }) => {
      return res.status(204);
    },
  },

  // GET /admin/closures/:id/affected-appointments - list affected appointments
  {
    method: 'GET',
    path: '/admin/closures/:id/affected-appointments',
    handler: async (req: { method: string; params: { id: string } }, res: { json: (body: any) => void }, ctx: { mock: any }) => {
      const id = req.params.id;
      // Return mock affected appointments based on closure id
      const mockAppointments: AffectedAppointment[] = [
        {
          id: `apt-affected-1`,
          appointmentId: 'apt-demo-1',
          patientProfileId: 'prf-patient-demo',
          patientName: 'Pat Placeholder',
          startsAt: '2026-12-25T08:00:00.000Z',
          endsAt: '2026-12-25T08:30:00.000Z',
          status: 'scheduled',
          reason: 'Demo follow-up',
        },
        {
          id: `apt-affected-2`,
          appointmentId: 'apt-demo-2',
          patientProfileId: 'prf-patient-2',
          patientName: 'Sam Example',
          startsAt: '2026-12-25T09:00:00.000Z',
          endsAt: '2026-12-25T09:30:00.000Z',
          status: 'scheduled',
          reason: 'Demo chest pain assessment',
        },
      ];
      // If closure is facility-scoped, only return appointments at that facility
      // For now, return all mock appointments
      return res.json(mockAppointments);
    },
  },
];