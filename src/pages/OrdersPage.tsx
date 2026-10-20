import { Link } from 'react-router-dom';
import { OrdersList } from '../features/orders/components/OrdersList';

export function OrdersPage() {
  return (
    <div className="container">
      <p>
        <Link to="/patient">Back to your care summary</Link>
      </p>
      <OrdersList />
    </div>
  );
}
