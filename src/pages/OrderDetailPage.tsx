// Patient order detail (issue #61): the order itself plus its payment
// status panel — the escrow's protection, made visible to the person it
// protects. Fields follow `PatientOrder` (= Prescription | LabOrder,
// issue #5's contract); status wording matches the orders list so the
// two screens read the same. The panel hides entirely when the order
// has no payment intent; a failed payment load shows a quiet note
// instead of breaking the page.
import { Link, useParams } from 'react-router-dom';
import { ApiError } from '../services/api-client';
import { Spinner } from '../components/Spinner';
import { useOrder } from '../features/orders/hooks/useOrders';
import { useOrderPaymentIntent } from '../features/payments/hooks/useOrderPaymentIntent';
import { OrderPaymentPanel } from '../features/payments/components/OrderPaymentPanel';
import { formatDay } from '../features/payments/status';
import type { PatientOrder } from '../types/models';
import styles from './OrderDetailPage.module.css';

/** Same wording as the orders list (OrdersList.statusLabel), so the two
 * screens never disagree about what an order's state is called. */
function lifecycleLabel(order: PatientOrder): string {
  if (order.status === 'active') {
    return order.selectedFacility ? 'In fulfillment' : 'Needs a facility';
  }
  if (order.status === 'completed') return 'Completed';
  if (order.status === 'cancelled') return 'Cancelled';
  return 'Superseded';
}

function orderTitle(order: PatientOrder): string {
  return order.orderType === 'prescription' ? order.medication : order.testName;
}

function orderDetail(order: PatientOrder): string {
  if (order.orderType === 'prescription') {
    return [order.dose, order.quantity].filter(Boolean).join(' · ');
  }
  return order.fastingRequired ? 'Fasting required' : 'No fasting required';
}

export function OrderDetailPage() {
  const { orderId } = useParams();
  const orderQuery = useOrder(orderId);
  const paymentQuery = useOrderPaymentIntent(orderId);

  if (orderQuery.isPending) {
    return (
      <div className="container">
        <p className={styles.loading} role="status">
          <Spinner size={16} /> Loading order…
        </p>
      </div>
    );
  }

  if (orderQuery.isError) {
    const notFound =
      orderQuery.error instanceof ApiError && orderQuery.error.status === 404;
    return (
      <div className="container">
        <div className="card">
          <h1>{notFound ? 'Order not found' : 'Couldn’t load this order'}</h1>
          <p>
            {notFound
              ? 'This order doesn’t exist, or it isn’t one of yours. Check the link, or ask the clinic that issued it.'
              : 'Something went wrong loading this order. Please try again.'}
          </p>
          <p>
            <Link to="/patient/orders">Back to your orders</Link>
          </p>
        </div>
      </div>
    );
  }

  const order = orderQuery.data;
  if (!order) return null; // Unreachable: pending/error handled above.

  return (
    <div className="container">
      <p className={styles.back}>
        <Link to="/patient/orders">← Your orders</Link>
      </p>
      <div className="card">
        <div className={styles.header}>
          <h1>{orderTitle(order)}</h1>
          <div className={styles.pills}>
            <span className={styles.typePill}>
              {order.orderType === 'prescription' ? 'Prescription' : 'Lab order'}
            </span>
            <span className={styles.statusPill} data-status={order.status}>
              {lifecycleLabel(order)}
            </span>
          </div>
        </div>

        <dl className={styles.facts}>
          <div>
            <dt>Issued</dt>
            <dd>{formatDay(order.issuedAt)}</dd>
          </div>
          {order.issuedByDoctorName && (
            <div>
              <dt>Prescribed by</dt>
              <dd>{order.issuedByDoctorName}</dd>
            </div>
          )}
          <div>
            <dt>Facility</dt>
            <dd>
              {order.selectedFacility ? order.selectedFacility.name : 'Not assigned yet'}
            </dd>
          </div>
          <div>
            <dt>Version</dt>
            <dd>v{order.version}</dd>
          </div>
        </dl>

        <p className={styles.detail}>{orderDetail(order)}</p>
        {order.instructions && (
          <p className={styles.instructions}>
            <strong>Instructions:</strong> {order.instructions}
          </p>
        )}

        {/* Hidden entirely when the order has no payment intent. */}
        {paymentQuery.data != null && <OrderPaymentPanel intent={paymentQuery.data} />}
        {paymentQuery.isError && (
          <p className={styles.paymentUnavailable} role="status">
            Payment status isn’t available right now — everything else about this order is shown
            above.
          </p>
        )}
      </div>
    </div>
  );
}
