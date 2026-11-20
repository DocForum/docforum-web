import { Link } from 'react-router-dom';
import { Spinner } from '../../../components/Spinner';
import { FulfillmentStatusBadge } from '../../../components/FulfillmentStatusBadge';
import type { PatientOrder } from '../../../types/models';
import { useMyOrders } from '../hooks/useOrders';
import styles from './PatientOrders.module.css';

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function orderTypeLabel(order: PatientOrder): string {
  return order.orderType === 'prescription' ? 'Prescription' : 'Lab order';
}

export function orderItemSummary(order: PatientOrder): string {
  const items = order.items ?? [];
  const total = items.length;
  const outstanding = items.filter((item) => item.quantityOutstanding > 0).length;
  if (total === 1) return '1 item';
  if (outstanding > 0) return `${total} items · ${outstanding} still outstanding`;
  return `${total} items`;
}

export function PatientOrdersList() {
  const { data: orders = [], isLoading, error } = useMyOrders();

  if (isLoading) {
    return (
      <div className={styles.loading} role="status">
        <Spinner />
        <span>Loading your orders…</span>
      </div>
    );
  }

  if (error) {
    return (
      <p className={styles.error} role="alert">
        {error instanceof Error ? error.message : 'Could not load your orders.'}
      </p>
    );
  }

  return (
    <section className={styles.page} aria-labelledby="orders-heading">
      <div className={styles.pageHeader}>
        <div>
          <h1 id="orders-heading">My orders</h1>
          <p className={styles.subtitle}>
            Prescriptions and lab orders, including anything a facility could not fill yet.
          </p>
        </div>
      </div>

      {orders.length === 0 ? (
        <p className={styles.empty}>You have no orders.</p>
      ) : (
        <ul className={styles.orderList}>
          {orders.map((order) => (
            <li key={order.id} className={styles.orderCard}>
              <div className={styles.orderCardHeader}>
                <div>
                  <p className={styles.orderType}>{orderTypeLabel(order)}</p>
                  <h2 className={styles.orderTitle}>{order.medicationOrTest}</h2>
                  <p className={styles.orderMeta}>
                    Issued {formatDate(order.issuedAt)}
                    {order.facilityName ? ` · ${order.facilityName}` : ''}
                  </p>
                </div>
                <FulfillmentStatusBadge status={order.fulfillmentStatus ?? 'unfulfilled'} />
              </div>

              <p className={styles.orderSummary}>{orderItemSummary(order)}</p>

              <div className={styles.orderFooter}>
                <span className={styles.expiry}>Expires {formatDate(order.expiresAt)}</span>
                <Link to={`/patient/orders/${order.id}`} className={styles.viewLink}>
                  View order
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
