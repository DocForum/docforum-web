import { http } from 'msw';
import { db } from '../db';
import { badRequest, conflict, notFound, paramId, respond } from '../helpers';
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
    '*/pharmacy-orders/fulfillments',
    respond('json', async ({ request }) => {
      const body = (await request.json().catch(() => ({}))) as {
        orderType?: string;
        orderId?: string;
        facilityId?: string;
        orderItemIds?: string[];
      };
      const orderId = body.orderId ?? '';
      const order = db.patientOrders.find((o) => o.id === orderId);
      if (!order) return notFound('order');
      if (body.orderType !== 'prescription') return badRequest('orderType must be prescription');

      const facility = (db.orderFacilities[orderId] ?? []).find(
        (candidate) => candidate.id === body.facilityId,
      );
      if (!facility) return notFound('qualified facility');

      if (body.orderItemIds?.length) {
        const itemIds = new Set(order.items?.map((item) => item.id) ?? []);
        if (body.orderItemIds.some((itemId) => !itemIds.has(itemId))) {
          return badRequest('one or more items are not in this order');
        }
        if (order.items?.some((item) =>
          body.orderItemIds?.includes(item.id) &&
          item.status === 'dispensed_elsewhere'
        )) {
          return conflict('one or more items were already dispensed elsewhere');
        }
      }

      const updated: PatientOrder = {
        ...order,
        selectedFacility: {
          id: facility.id,
          name: facility.name,
          type: facility.type,
          isOpen: facility.isOpen,
        },
        items: order.items?.map((item) =>
          !body.orderItemIds || body.orderItemIds.includes(item.id)
            ? {
                ...item,
                routedToFacilityId: facility.id,
                routedToFacilityName: facility.name,
              }
            : item,
        ),
      };
      db.patientOrders = db.patientOrders.map((candidate) =>
        candidate.id === updated.id ? updated : candidate,
      );
      return updated;
    }),
  ),
];
