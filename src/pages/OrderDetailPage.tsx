// Patient order detail (issue #61): the order itself plus its payment
// status panel — the escrow's protection, made visible to the person it
// protects. The panel hides entirely when the order has no payment
// intent; a failed payment load shows a quiet note instead of breaking
// the page.
import { Link, useParams } from 'react-router-dom';
import { ApiError } from '../services/api-client';
import { Spinner } from '../components/Spinner';
import { useOrder } from '../features/orders/hooks/useOrder';
import { useOrderPaymentIntent } from '../features/payments/hooks/useOrderPaymentIntent';
import { OrderPaymentPanel } from '../features/payments/components/OrderPaymentPanel';
import styles from './OrderDetailPage.module.css';

const ORDER_TYPE_LABELS = { prescription: 'Prescription', lab: 'Lab test' } as const;
const ORDER_STATUS_LABELS = {
  issued: 'Issued',
  ready: 'Ready',
  fulfilled: 'Fulfilled',
  cancelled: 'Cancelled',
} as const;

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString();
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
            <Link to="/">Back to home</Link>
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
        <Link to="/">← Back</Link>
      </p>
      <div className="card">
        <div className={styles.header}>
          <h1>{order.itemName}</h1>
          <div className={styles.pills}>
            <span className={styles.typePill}>{ORDER_TYPE_LABELS[order.orderType]}</span>
            <span className={styles.statusPill} data-status={order.status}>
              {ORDER_STATUS_LABELS[order.status]}
            </span>
          </div>
        </div>

        <dl className={styles.facts}>
          <div>
            <dt>Issued</dt>
            <dd>{formatDate(order.issuedAt)}</dd>
          </div>
          <div>
            <dt>Prescribed by</dt>
            <dd>{order.doctorName}</dd>
          </div>
          <div>
            <dt>Facility</dt>
            <dd>{order.facility ? order.facility.name : 'Not assigned yet'}</dd>
          </div>
          {order.expiresAt && (
            <div>
              <dt>Expires</dt>
              <dd>{formatDate(order.expiresAt)}</dd>
            </div>
          )}
        </dl>

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
