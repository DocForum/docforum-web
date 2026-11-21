import { Link } from 'react-router-dom';
import { EmptyState } from '../../../components/states/EmptyState';
import { QueryState } from '../../../components/states/QueryState';
import { Skeleton } from '../../../components/states/Skeleton';
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
  const ordersQuery = useMyOrders();
  const orders = ordersQuery.data ?? [];

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

      <QueryState
        result={ordersQuery}
        loading={<Skeleton lines={6} height="2rem" label="Loading your orders" />}
        errorTitle="Could not load your orders"
        errorMessage={ordersQuery.error instanceof Error ? ordersQuery.error.message : undefined}
        onRetry={() => void ordersQuery.refetch()}
        isEmpty={(data) => (data ?? []).length === 0}
        empty={
          <EmptyState
            title="You have no orders"
            description="Prescriptions and lab orders will appear here once issued."
            action={{ label: 'Back to care hub', to: '/patient' }}
          />
        }
      >
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
      </QueryState>
    </section>
  );
}
