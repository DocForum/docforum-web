// Patient order detail (issue #61 + #71): <OrderDetail> is the single
// order view — QR code, status, items, print affordance. The payment
// status panel from PR #187 is rendered below it when the order has a
// payment intent; a failed lookup degrades to a quiet note, never a
// broken page.
import { Link, useParams } from 'react-router-dom';
import { ApiError } from '../services/api-client';
import { PageError } from '../components/states/PageError';
import { queryErrorMessage } from '../components/states/QueryState';
import { Skeleton } from '../components/states/Skeleton';
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
        <Skeleton lines={5} height="1.5rem" label="Loading order" />
      </div>
    );
  }

  if (orderQuery.isError) {
    const notFound =
      orderQuery.error instanceof ApiError && orderQuery.error.status === 404;
    return (
      <div className="container">
        {notFound ? (
          <div className="card">
            <h1>Order not found</h1>
            <p>
              This order doesn't exist, or it isn't one of yours. Check the link, or ask the clinic
              that issued it.
            </p>
          </div>
        ) : (
          <PageError
            title="Your order couldn't be loaded"
            message={queryErrorMessage(orderQuery.error)}
            onRetry={() => void orderQuery.refetch()}
            fallback={{ label: 'Back to your orders', to: '/patient/orders' }}
          />
        )}
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
