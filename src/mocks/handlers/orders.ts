import { http } from 'msw';
import { db } from '../db';
import { badRequest, conflict, notFound, paramId, respond } from '../helpers';
import type {
  OrderFulfillmentProgress,
  OrderTypeForPayment,
  PatientOrder,
} from '../../types/models';

function findOrder(orderId: string): PatientOrder | undefined {
  return db.patientOrders.find((order) => order.id === orderId);
}

/** Mirrors docforum-core: progress is counted from item rows. */
export function deriveFulfillmentProgress(order: PatientOrder): OrderFulfillmentProgress {
  const items = order.items ?? [];
  const dispensedItems = items.filter((item) => item.quantityOutstanding <= 0).length;

  let status: OrderFulfillmentProgress['status'] = 'issued';
  if (items.length > 0 && dispensedItems === items.length) {
    status = 'fulfilled';
  } else if (dispensedItems > 0) {
    status = 'partially_fulfilled';
  }

  return { totalItems: items.length, dispensedItems, status };
}

const ORDER_TYPES: OrderTypeForPayment[] = ['prescription', 'lab_order'];

export const orderHandlers = [
  http.get('*/orders/mine', respond('list', () => db.patientOrders)),

  // Fulfilment progress (#262). Registered before the generic order detail
  // route so `fulfillment-status` is never read as an order id.
  http.get(
    '*/pharmacy-orders/orders/:orderId/fulfillment-status',
    respond('json', ({ params, request }) => {
      const order = findOrder(paramId(params, 'orderId'));
      if (!order) return notFound('order');

      const orderType = new URL(request.url).searchParams.get('orderType');
      if (!orderType || !ORDER_TYPES.includes(orderType as OrderTypeForPayment)) {
        return badRequest(
          'VALIDATION_ERROR',
          `orderType must be one of ${ORDER_TYPES.join(', ')}`,
        );
      }
      if (orderType !== order.orderType) {
        return badRequest('VALIDATION_ERROR', 'orderType does not match this order');
      }
      if (order.status === 'superseded') {
        return conflict('order version was superseded; request the current version');
      }

      return deriveFulfillmentProgress(order);
    }),
  ),

  http.get(
    '*/orders/:orderId/qualified-facilities',
    respond('list', ({ params }) => {
      const orderId = paramId(params, 'orderId');
      if (!findOrder(orderId)) return notFound('order');
      return db.orderFacilities[orderId] ?? [];
    }),
  ),

  http.get(
    '*/orders/:orderId/remaining-items/facilities',
    respond('list', ({ params, request }) => {
      const orderId = paramId(params, 'orderId');
      if (!findOrder(orderId)) return notFound('order');
      const itemIds = (new URL(request.url).searchParams.get('itemIds') ?? '')
        .split(',')
        .filter(Boolean);
      if (itemIds.length === 0) {
        return badRequest('VALIDATION_ERROR', 'itemIds is required');
      }
      return db.orderFacilities[orderId] ?? [];
    }),
  ),

  http.post(
    '*/orders/:orderId/route-remaining',
    respond('json', async ({ params, request }) => {
      const orderId = paramId(params, 'orderId');
      const order = findOrder(orderId);
      if (!order) return notFound('order');

      const body = (await request.json().catch(() => ({}))) as {
        facilityId?: string;
        itemIds?: string[];
      };
      const facility = (db.orderFacilities[orderId] ?? []).find(
        (candidate) => candidate.id === body.facilityId,
      );
      if (!facility) return notFound('qualified facility');

      const itemIds = new Set(body.itemIds ?? []);
      if (itemIds.size === 0) {
        return badRequest('VALIDATION_ERROR', 'itemIds is required');
      }

      const alreadyRouted = (order.items ?? []).some(
        (item) => itemIds.has(item.id) && item.routedToFacilityId,
      );
      if (alreadyRouted) return conflict('items were already routed');

      const updated: PatientOrder = {
        ...order,
        items: (order.items ?? []).map((item) =>
          itemIds.has(item.id) && item.quantityOutstanding > 0
            ? {
                ...item,
                routedToFacilityId: facility.id,
                routedToFacilityName: facility.name,
                canDispense: false,
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

  // Keep last: `/orders/mine` and the nested routes above are more specific.
  http.get(
    '*/orders/:orderId',
    respond('json', ({ params }) => {
      return findOrder(paramId(params, 'orderId')) ?? notFound('order');
    }),
  ),
];
