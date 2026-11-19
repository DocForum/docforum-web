import { Link } from 'react-router-dom';
import { Spinner } from '../../../components/Spinner';
import { FulfillmentStatusBadge } from '../../../components/FulfillmentStatusBadge';
import { useT } from '../../../i18n/useT';
import type { PatientOrder } from '../../../types/models';
import { useMyOrders } from '../hooks/useOrders';
import styles from './PatientOrders.module.css';

type Translate = ReturnType<typeof useT>;

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** API `orderType` is mapped to copy explicitly; the raw value never renders. */
export function orderTypeLabel(order: PatientOrder, t: Translate): string {
  return order.orderType === 'prescription'
    ? t('orders.type.prescription', 'Prescription')
    : t('orders.type.labOrder', 'Lab order');
}

/** Counts go through ICU plurals so a locale decides its own plural rules. */
export function orderItemSummary(order: PatientOrder, t: Translate): string {
  const items = order.items ?? [];
  const total = items.length;
  const outstanding = items.filter((item) => item.quantityOutstanding > 0).length;
  if (outstanding > 0) {
    return t(
      'orders.itemCountOutstanding',
      '{total, plural, one {1 item} other {# items}} · {outstanding, plural, one {1 still outstanding} other {# still outstanding}}',
      { total, outstanding },
    );
  }
  return t('orders.itemCount', '{total, plural, one {1 item} other {# items}}', { total });
}

export function PatientOrdersList() {
  const t = useT();
  const { data: orders = [], isLoading, error } = useMyOrders();

  if (isLoading) {
    return (
      <div className={styles.loading} role="status">
        <Spinner />
        <span>{t('orders.list.loading', 'Loading your orders…')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <p className={styles.error} role="alert">
        {error instanceof Error
          ? error.message
          : t('orders.list.error', 'Could not load your orders.')}
      </p>
    );
  }

  return (
    <section className={styles.page} aria-labelledby="orders-heading">
      <div className={styles.pageHeader}>
        <div>
          <h1 id="orders-heading">{t('orders.list.title', 'My orders')}</h1>
          <p className={styles.subtitle}>
            {t(
              'orders.list.subtitle',
              'Prescriptions and lab orders, including anything a facility could not fill yet.',
            )}
          </p>
        </div>
      </div>

      {orders.length === 0 ? (
        <p className={styles.empty}>{t('orders.list.empty', 'You have no orders.')}</p>
      ) : (
        <ul className={styles.orderList}>
          {orders.map((order) => (
            <li key={order.id} className={styles.orderCard}>
              <div className={styles.orderCardHeader}>
                <div>
                  {/* Medication and test names are clinical data: never translated. */}
                  <p className={styles.orderType}>{orderTypeLabel(order, t)}</p>
                  <h2 className={styles.orderTitle}>{order.medicationOrTest}</h2>
                  <p className={styles.orderMeta}>
                    {t('orders.list.issued', 'Issued {date}', {
                      date: formatDate(order.issuedAt),
                    })}
                    {order.facilityName ? ` · ${order.facilityName}` : ''}
                  </p>
                </div>
                <FulfillmentStatusBadge status={order.fulfillmentStatus ?? 'unfulfilled'} t={t} />
              </div>

              <p className={styles.orderSummary}>{orderItemSummary(order, t)}</p>

              <div className={styles.orderFooter}>
                <span className={styles.expiry}>
                  {t('orders.list.expires', 'Expires {date}', {
                    date: formatDate(order.expiresAt),
                  })}
                </span>
                <Link to={`/patient/orders/${order.id}`} className={styles.viewLink}>
                  {t('orders.list.viewOrder', 'View order')}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
