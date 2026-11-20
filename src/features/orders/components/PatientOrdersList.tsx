import { Link } from 'react-router-dom';
import { Spinner } from '../../../components/Spinner';
import { FulfillmentStatusBadge } from '../../../components/FulfillmentStatusBadge';
import { useFormatters } from '../../../i18n/formatters';
import { useT, type Translator } from '../../../i18n/useT';
import { ApiError } from '../../../services/api-client';
import type { PatientOrder } from '../../../types/models';
import { useMyOrders } from '../hooks/useOrders';
import styles from './PatientOrders.module.css';

export function orderTypeLabel(order: PatientOrder, t: Translator): string {
  const isPrescription = order.orderType === 'prescription';
  return t(`payments.orderType.${isPrescription ? 'prescription' : 'labOrder'}`, isPrescription ? 'Prescription' : 'Lab order');
}

export function orderItemSummary(order: PatientOrder, t: Translator): string {
  const items = order.items ?? [];
  const total = items.length;
  const outstanding = items.filter((item) => item.quantityOutstanding > 0).length;
  if (total === 1) return t('orders.itemSummary.one', '{count, plural, one {# item} other {# items}}', { count: total });
  if (outstanding > 0) {
    return t(
      'orders.itemSummary.outstanding',
      '{total, plural, one {# item} other {# items}} · {outstanding} still outstanding',
      { total, outstanding },
    );
  }
  return t('orders.itemSummary.count', '{count, plural, one {# item} other {# items}}', { count: total });
}

export function PatientOrdersList() {
  const t = useT();
  const { date: formatDate } = useFormatters();
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
        {error instanceof ApiError && (error.status === 401 || error.status === 403)
          ? t('orders.list.forbidden', 'Sign in again to view your orders.')
          : t('orders.list.loadError', 'Could not load your orders. Try again shortly.')}
      </p>
    );
  }

  return (
    <section className={styles.page} aria-labelledby="orders-heading">
      <div className={styles.pageHeader}>
        <div>
          <h1 id="orders-heading">{t('orders.list.title', 'My orders')}</h1>
          <p className={styles.subtitle}>
            {t('orders.list.subtitle', 'Prescriptions and lab orders, including anything a facility could not fill yet.')}
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
                  <p className={styles.orderType}>{orderTypeLabel(order, t)}</p>
                  <h2 className={styles.orderTitle}>{order.medicationOrTest}</h2>
                  <p className={styles.orderMeta}>
                    {t('orders.list.issued', 'Issued {date}', { date: formatDate(order.issuedAt) })}
                    {order.facilityName ? ` · ${order.facilityName}` : ''}
                  </p>
                </div>
                <FulfillmentStatusBadge status={order.fulfillmentStatus ?? 'unfulfilled'} />
              </div>

              <p className={styles.orderSummary}>{orderItemSummary(order, t)}</p>

              <div className={styles.orderFooter}>
                <span className={styles.expiry}>
                  {t('orders.list.expires', 'Expires {date}', {
                    date: order.expiresAt ? formatDate(order.expiresAt) : '—',
                  })}
                </span>
                <Link to={`/patient/orders/${order.id}`} className={styles.viewLink}>
                  {t('orders.list.view', 'View order')}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
