// Patient order detail (issue #61). ASSUMED endpoint — docforum-core has
// no Order model yet (its docforum-core#9 / #85 are open).
import { http } from 'msw';
import { PATIENT_ORDERS } from '../fixtures';
import { notFound, paramId, respond } from '../helpers';

export const ordersHandlers = [
  http.get(
    '*/patients/me/orders/:orderId',
    respond('json', ({ params }) => {
      const order = PATIENT_ORDERS.find((o) => o.id === paramId(params, 'orderId'));
      return order ?? notFound('order');
    }),
  ),
];
