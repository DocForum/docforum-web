import { Link } from 'react-router-dom';
import { Spinner } from '../../../components/Spinner';
import type { PatientOrder } from '../../../types/models';
import { useMyOrders } from '../hooks/useOrders';
import { OrderProgress } from './OrderProgress';
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

export function orderTitle(order: PatientOrder): string {
  if (order.orderType === 'prescription') return order.medicationOrTest ?? order.medication;
  return order.medicationOrTest ?? order.testName;
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

  // Superseded versions describe a replaced order. Only the current
  // version's rows are meaningful, so they leave the list (with a note
  // rather than silently disappearing).
  const currentOrders = orders.filter((order) => order.status !== 'superseded');
  const supersededCount = orders.length - currentOrders.length;

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

      {currentOrders.length === 0 ? (
        <p className={styles.empty}>You have no current orders.</p>
      ) : (
        <ul className={styles.orderList}>
          {currentOrders.map((order) => (
            <li key={order.id} className={styles.orderCard}>
              <div className={styles.orderCardHeader}>
                <div>
                  <p className={styles.orderType}>{orderTypeLabel(order)}</p>
                  <h2 className={styles.orderTitle}>{orderTitle(order)}</h2>
                  <p className={styles.orderMeta}>
                    Issued {formatDate(order.issuedAt)}
                    {order.facilityName ? ` · ${order.facilityName}` : ''}
                  </p>
                </div>
                <OrderProgress order={order} />
              </div>

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

      {supersededCount > 0 && (
        <p className={styles.hiddenVersions}>
          {supersededCount === 1
            ? '1 earlier version was replaced by a newer order and is not shown.'
            : `${supersededCount} earlier versions were replaced by newer orders and are not shown.`}
        </p>
      )}
    </section>
  );
}
