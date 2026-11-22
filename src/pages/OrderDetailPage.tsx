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
import { useT } from '../i18n/useT';
import { OrderFulfillment } from '../features/orders/components/OrderFulfillment';
import styles from './OrderDetailPage.module.css';

export function OrderDetailPage() {
  const t = useT();
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
        <p>
          {t('orders.detail.notFound', 'Order not found.')} <Link to="/patient">{t('orders.detail.backDashboard', 'Back to dashboard')}</Link>
        </p>
      </div>
    );
  }

  if (orderQuery.isPending) {
    return (
      <div className="container">
        <Skeleton lines={5} height="1.5rem" label={t('orders.detail.loading', 'Loading order')} />
      </div>
    );
  }

  if (orderQuery.isError) {
    const notFound =
      orderQuery.error instanceof ApiError && orderQuery.error.status === 404;
    const message =
      orderQuery.error instanceof ApiError &&
      (orderQuery.error.status === 401 || orderQuery.error.status === 403)
        ? t('orders.detail.forbidden', 'Sign in again to view this order.')
        : queryErrorMessage(orderQuery.error);
    return (
      <div className="container">
        {notFound ? (
          <div className="card">
            <h1>{t('orders.detail.notFound', 'Order not found')}</h1>
            <p>
              {t('orders.detail.notFoundBody', "This order doesn't exist, or it isn't one of yours. Check the link, or ask the clinic that issued it.")}
            </p>
          </div>
        ) : (
          <PageError
            title={t('orders.detail.errorTitle', "Your order couldn't be loaded")}
            message={message}
            onRetry={() => void orderQuery.refetch()}
            fallback={{ label: t('orders.detail.back', 'Back to your orders'), to: '/patient/orders' }}
          />
        )}
      </div>
    );
  }

  // orderQuery.data is present — PatientOrder loaded successfully.
  // Render the single order view from <OrderDetail> then the payment panel.
  return (
    <div className="container">
      <nav className="no-print" aria-label={t('orders.detail.breadcrumb', 'Breadcrumb')}>
        <p className={styles.back}>
          <Link to="/patient/orders">{t('orders.detail.backArrow', '← Back to my orders')}</Link>
        </p>
      </nav>

      {/* Single order view: QR code, status, items, print affordance. */}
      <OrderDetail orderId={orderId} />

      {/* Item-level fulfilment, the payment rule and the partial-fulfilment
          picker — merged here so /patient/orders/:orderId has one detail
          screen instead of two competing ones. */}
      <OrderFulfillment order={orderQuery.data} />

      {/* Payment panel — hidden entirely when the order has no payment
          intent; degrades to a quiet note on any other lookup failure. */}
      {paymentQuery.data != null && <OrderPaymentPanel intent={paymentQuery.data} />}
      {paymentQuery.isError && (
        <p className={styles.paymentUnavailable} role="status">
          {t('orders.detail.paymentStatusUnavailable', "Payment status isn't available right now — everything else about this order is shown above.")}
        </p>
      )}
    </div>
  );
}
