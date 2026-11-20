import { Link } from 'react-router-dom';
import { PatientOrdersList } from '../features/orders/components/PatientOrdersList';

export function PatientOrdersPage() {
  return (
    <div className="container">
      <p>
        <Link to="/patient">Back to your care summary</Link>
      </p>
      <PatientOrdersList />
    </div>
  );
}
