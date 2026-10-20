// Patient order detail (issue #61 + #71): <OrderDetail> is the single
// order view — QR code, status, items, print affordance. The payment
// status panel from PR #187 is rendered below it when the order has a
// payment intent; a failed lookup degrades to a quiet note, never a
// broken page.
import { Link, useParams } from 'react-router-dom';
import { ApiError } from '../services/api-client';
import { Spinner } from '../components/Spinner';
import { useOrder } from '../features/orders/hooks/useOrders';
import { useOrderPaymentIntent } from '../features/payments/hooks/useOrderPaymentIntent';
import { OrderPaymentPanel } from '../features/payments/components/OrderPaymentPanel';
import { OrderDetail } from '../features/orders/components/OrderDetail';
import styles from './OrderDetailPage.module.css';

export function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  // useOrder (from useOrders.ts) fetches the PatientOrder shape — used
  // here only to gate loading/error/not-found states that the existing
  // tests rely on. <OrderDetail> below fetches the richer Order shape
  // (token, items, doctorName) independently via its own hook.
  const orderQuery = useOrder(orderId);
  const paymentQuery = useOrderPaymentIntent(orderId);

  if (!orderId) {
    return (
      <div className="container">
        <p>Order not found. <Link to="/patient">Back to dashboard</Link></p>
      </div>
    );
  }

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
          <h1>{notFound ? 'Order not found' : "Couldn't load this order"}</h1>
          <p>
            {notFound
              ? "This order doesn't exist, or it isn't one of yours. Check the link, or ask the clinic that issued it."
              : 'Something went wrong loading this order. Please try again.'}
          </p>
          <p>
            <Link to="/patient/orders">Back to your orders</Link>
          </p>
        </div>
      </div>
    );
  }

  // orderQuery.data is present — PatientOrder loaded successfully.
  // Render the single order view from <OrderDetail> then the payment panel.
  return (
    <div className="container">
      <nav className="no-print" aria-label="Breadcrumb">
        <p className={styles.back}>
          <Link to="/patient/orders">← Your orders</Link>
        </p>
      </nav>

      {/* Single order view: QR code, status, items, print affordance. */}
      <OrderDetail orderId={orderId} />

      {/* Payment panel — hidden entirely when the order has no payment
          intent; degrades to a quiet note on any other lookup failure. */}
      {paymentQuery.data != null && <OrderPaymentPanel intent={paymentQuery.data} />}
      {paymentQuery.isError && (
        <p className={styles.paymentUnavailable} role="status">
          Payment status isn't available right now — everything else about this order is shown
          above.
        </p>
      )}
    </div>
  );
}
