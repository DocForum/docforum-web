import { Link, useParams } from 'react-router-dom';
import { PatientOrderDetail } from '../features/orders/components/PatientOrderDetail';

export function PatientOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();

  if (!orderId) {
    return (
      <div className="container">
        <p>
          Order not found. <Link to="/patient/orders">Back to your orders</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="container">
      <PatientOrderDetail orderId={orderId} />
    </div>
  );
}
