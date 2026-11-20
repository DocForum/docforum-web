import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/Button';
import { FulfillmentStatusBadge } from '../../../components/FulfillmentStatusBadge';
import { Spinner } from '../../../components/Spinner';
import type { OrderItemFulfillment, OrderPaymentSummary, PatientOrder } from '../../../types/models';
import { ITEM_STATUS_LABELS } from '../../fulfillment/status';
import { useOrder } from '../hooks/useOrders';
import { orderTypeLabel } from './PatientOrdersList';
import { RemainingItemsFacilityPicker } from './RemainingItemsFacilityPicker';
import styles from './PatientOrders.module.css';

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function paymentStatusLabel(status: OrderPaymentSummary['status']): string {
  switch (status) {
    case 'held':
      return 'Held in escrow';
    case 'partially_released':
      return 'Partially released';
    case 'released':
      return 'Released';
    case 'refunded':
      return 'Refunded';
    default:
      return 'No payment';
  }
}

function ItemCard({ item }: { item: OrderItemFulfillment }) {
  const isOutstanding = item.quantityOutstanding > 0;

  return (
    <li className={styles.detailItem} data-status={item.status}>
      <div className={styles.detailItemHeader}>
        <div>
          <h3 className={styles.detailItemName}>{item.name}</h3>
          {item.instructions && (
            <p className={styles.detailItemInstructions}>{item.instructions}</p>
          )}
        </div>
        <span className={styles.itemStatus} data-status={item.status}>
          {ITEM_STATUS_LABELS[item.status]}
        </span>
      </div>

      <dl className={styles.detailQuantities} aria-label={`Quantities for ${item.name}`}>
        <div>
          <dt>Prescribed</dt>
          <dd>
            {item.quantityPrescribed} {item.unit}
          </dd>
        </div>
        <div>
          <dt>Dispensed</dt>
          <dd>
            {item.quantityDispensed} {item.unit}
          </dd>
        </div>
        <div>
          <dt>Outstanding</dt>
          <dd>
            {item.quantityOutstanding} {item.unit}
          </dd>
        </div>
      </dl>

      {item.status === 'dispensed_elsewhere' && (
        <p className={styles.warning} role="note">
          <strong>Dispensed elsewhere.</strong>{' '}
          {item.dispensedByFacilityName
            ? `This item was already dispensed by ${item.dispensedByFacilityName}.`
            : 'This item was already dispensed at another facility.'}{' '}
          It cannot be dispensed again here.
        </p>
      )}

      {item.dispensedByFacilityName && item.status !== 'dispensed_elsewhere' && (
        <p className={styles.itemMeta}>
          Dispensed by {item.dispensedByFacilityName}
          {item.dispensedAt ? ` on ${formatDate(item.dispensedAt)}` : ''}.
        </p>
      )}

      {item.routedToFacilityName && (
        <p className={styles.routedNote} role="note">
          Remaining {item.quantityOutstanding} {item.unit} routed to{' '}
          <strong>{item.routedToFacilityName}</strong>.
        </p>
      )}

      {item.blockedReason && item.status !== 'dispensed_elsewhere' && (
        <p className={styles.warning} role="note">
          {item.blockedReason}
        </p>
      )}

      {isOutstanding && item.status !== 'rejected' && !item.routedToFacilityId && (
        <p className={styles.itemMeta}>
          {item.quantityOutstanding} {item.unit} still to be dispensed.
        </p>
      )}
    </li>
  );
}

export function PatientOrderDetail({ orderId }: { orderId: string }) {
  const { data: order, isLoading, error } = useOrder(orderId);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const outstandingItems = useMemo(
    () =>
      (order?.items ?? []).filter(
        (item) => item.quantityOutstanding > 0 && !item.routedToFacilityId,
      ),
    [order],
  );

  const hasRoutedItems = (order?.items ?? []).some((item) => item.routedToFacilityId);
  const allDispensed =
    (order?.items ?? []).every((item) => item.quantityOutstanding <= 0);

  if (isLoading) {
    return (
      <div className={styles.loading} role="status">
        <Spinner />
        <span>Loading order…</span>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className={styles.page}>
        <p className={styles.error} role="alert">
          {error instanceof Error ? error.message : 'Order not found.'}
        </p>
        <Link to="/patient/orders" className={styles.backLink}>
          Back to my orders
        </Link>
      </div>
    );
  }

  const handleRouted = (updated: PatientOrder) => {
    setIsPickerOpen(false);
    const facilityName = (updated.items ?? []).find((item) => item.routedToFacilityName)
      ?.routedToFacilityName;
    setSuccessMessage(
      facilityName
        ? `Remaining items routed to ${facilityName}. They are now on that facility's queue.`
        : 'Remaining items routed to another facility.',
    );
  };

  return (
    <section className={styles.page} aria-labelledby="order-detail-heading">
      <Link to="/patient/orders" className={styles.backLink}>
        ← Back to my orders
      </Link>

      <div className={styles.detailHeader}>
        <div>
          <p className={styles.orderType}>{orderTypeLabel(order)}</p>
          <h1 id="order-detail-heading" className={styles.detailTitle}>
            {order.medicationOrTest}
          </h1>
          <p className={styles.orderMeta}>
            Order {order.id} · issued {formatDate(order.issuedAt)}
            {order.facilityName ? ` · ${order.facilityName}` : ''}
          </p>
        </div>
        <FulfillmentStatusBadge status={order.fulfillmentStatus ?? 'unfulfilled'} />
      </div>

      <div className={styles.paymentCallout} role="note">
        <div>
          <strong>Payment implications</strong>
          <p>{order.payment?.rule ?? 'Payment details are not available for this order.'}</p>
        </div>
        <span className={styles.paymentStatus}>
          {paymentStatusLabel(order.payment?.status ?? 'none')}
        </span>
      </div>

      {successMessage && (
        <p className={styles.success} role="status">
          {successMessage}
        </p>
      )}

      <div className={styles.detailBody}>
        <div className={styles.itemSection}>
          <h2 className={styles.sectionTitle}>Items</h2>
          <ul className={styles.detailItemList}>
            {(order.items ?? []).map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </ul>
        </div>

        <aside className={styles.detailAside}>
          <h2 className={styles.sectionTitle}>What happens next?</h2>
          {allDispensed ? (
            <p className={styles.asideText}>
              All items on this order have been dispensed. Nothing else is outstanding.
            </p>
          ) : outstandingItems.length > 0 ? (
            <>
              <p className={styles.asideText}>
                You can collect the outstanding items from another facility. That facility will
                only receive the items listed here.
              </p>
              <Button type="button" onClick={() => setIsPickerOpen(true)}>
                Get remaining items elsewhere
              </Button>
            </>
          ) : hasRoutedItems ? (
            <p className={styles.asideText}>
              The remaining items have been routed. Check the item list for the receiving
              facility.
            </p>
          ) : (
            <p className={styles.asideText}>
              There are no outstanding items available to route. Items already dispensed elsewhere
              cannot be moved again.
            </p>
          )}

          <p className={styles.asideFinePrint}>
            A partially filled order does not release the full escrow amount. DocForum&apos;s
            backend applies its partial-fulfilment release rule; this screen shows the rule it
            returns rather than calculating a payout.
          </p>
        </aside>
      </div>

      {isPickerOpen && outstandingItems.length > 0 && (
        <RemainingItemsFacilityPicker
          order={order}
          items={outstandingItems}
          onClose={() => setIsPickerOpen(false)}
          onRouted={handleRouted}
        />
      )}
    </section>
  );
}
