import { http } from 'msw';
import { db } from '../db';
import { conflict, notFound, paramId, respond } from '../helpers';
import type { PatientOrder } from '../../types/models';

export const orderHandlers = [
  http.get('*/orders/mine', respond('list', () => db.patientOrders)),

  // Single-order detail for the patient order page (issue #61). Must stay
  // after `/orders/mine` above so `mine` isn't captured as an orderId.
  http.get(
    '*/orders/:orderId',
    respond('json', ({ params }) => {
      const order = db.patientOrders.find((o) => o.id === paramId(params, 'orderId'));
      return order ?? notFound('order');
    }),
  ),

  http.get(
    '*/orders/:orderId/qualified-facilities',
    respond('list', ({ params }) => {
      const orderId = paramId(params, 'orderId');
      const order = db.patientOrders.find((o) => o.id === orderId);
      if (!order) return notFound('order');
      return db.orderFacilities[orderId] ?? [];
    }),
  ),

  http.post(
    '*/orders/:orderId/fulfillment-facility',
    respond('json', async ({ params, request }) => {
      const orderId = paramId(params, 'orderId');
      const order = db.patientOrders.find((o) => o.id === orderId);
      if (!order) return notFound('order');

      const body = (await request.json().catch(() => ({}))) as {
        facilityId?: string;
        expectedVersion?: number;
      };

      if (body.expectedVersion !== undefined && body.expectedVersion !== order.version) {
        return conflict('order changed since it was loaded');
      }

      const facility = (db.orderFacilities[orderId] ?? []).find(
        (candidate) => candidate.id === body.facilityId,
      );
      if (!facility) return notFound('qualified facility');

      const updated: PatientOrder = {
        ...order,
        selectedFacility: {
          id: facility.id,
          name: facility.name,
          type: facility.type,
          isOpen: facility.isOpen,
        },
      };
      db.patientOrders = db.patientOrders.map((candidate) =>
        candidate.id === updated.id ? updated : candidate,
      );
      return updated;
    }),
  ),
];
