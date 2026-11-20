import { useParams } from 'react-router-dom';
import { PatientOrderDetail } from '../features/orders/components/PatientOrderDetail';

export function PatientOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  return (
    <div className="container">
      <PatientOrderDetail orderId={orderId ?? ''} />
    </div>
  );
}
