import { useParams, Link } from 'react-router-dom';
import { OrderDetail } from '../features/orders/components/OrderDetail';

/** Route-level page for a single order: /patient/orders/:orderId
 * Delegates all business logic and presentation to <OrderDetail>. */
export function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();

  if (!orderId) {
    return (
      <div className="container">
        <p>Order not found. <Link to="/patient">Back to dashboard</Link></p>
      </div>
    );
  }

  return (
    <div className="container">
      <nav className="no-print" aria-label="Breadcrumb" style={{ marginBottom: '1.5rem' }}>
        <Link to="/patient">← Patient dashboard</Link>
      </nav>
      <OrderDetail orderId={orderId} />
    </div>
  );
}
