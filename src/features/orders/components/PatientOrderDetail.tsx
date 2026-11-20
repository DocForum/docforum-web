import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/Button';
import { FulfillmentStatusBadge } from '../../../components/FulfillmentStatusBadge';
import { Spinner } from '../../../components/Spinner';
import type { OrderItemFulfillment, PatientOrder } from '../../../types/models';
import { orderTypeLabel, orderTitle } from './PatientOrdersList';
import { RemainingItemsFacilityPicker } from './RemainingItemsFacilityPicker';
import { fulfillmentProgressText } from './OrderProgress';
import { useOrder, useOrderFulfillmentProgress } from '../hooks/useOrders';
import styles from './PatientOrders.module.css';

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const ITEM_STATUS_LABELS: Record<OrderItemFulfillment['status'], string> = {
  pending: 'Pending',
  partially_dispensed: 'Partially dispensed',
  dispensed: 'Dispensed',
  dispensed_elsewhere: 'Dispensed elsewhere',
  rejected: 'Rejected',
};

function ItemCard({ item }: { item: OrderItemFulfillment }) {
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

      {item.quantityOutstanding > 0 &&
        item.status !== 'rejected' &&
        !item.routedToFacilityId && (
          <p className={styles.itemMeta}>
            {item.quantityOutstanding} {item.unit} still to be dispensed.
          </p>
        )}
    </li>
  );
}

export function PatientOrderDetail({ orderId }: { orderId: string }) {
  const { data: order, isLoading, error } = useOrder(orderId);
  const progressQuery = useOrderFulfillmentProgress(order);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const outstandingItems = useMemo(
    () =>
      (order?.items ?? []).filter(
        (item) => item.quantityOutstanding > 0 && !item.routedToFacilityId,
      ),
    [order],
  );

  const progress = progressQuery.data;
  const isPartiallyFulfilled = progress?.status === 'partially_fulfilled';
  const isFulfilled = progress?.status === 'fulfilled';
  const hasRoutedItems = (order?.items ?? []).some((item) => item.routedToFacilityId);

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

  if (order.status === 'superseded') {
    return (
      <section className={styles.page} aria-labelledby="order-detail-heading">
        <Link to="/patient/orders" className={styles.backLink}>
          ← Back to my orders
        </Link>
        <div className={styles.supersededNote} role="note">
          <h1 id="order-detail-heading" className={styles.detailTitle}>
            This order was superseded
          </h1>
          <p>
            A newer version replaced this order. Fulfilment progress is only shown for the
            current version, so it is not displayed here.
          </p>
          <Link to="/patient/orders">View your current orders</Link>
        </div>
      </section>
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
            {orderTitle(order)}
          </h1>
          <p className={styles.orderMeta}>
            Order {order.id} · issued {formatDate(order.issuedAt)}
            {order.facilityName ? ` · ${order.facilityName}` : ''}
          </p>
        </div>

        <div className={styles.progressPanel}>
          {progressQuery.isLoading && (
            <span className={styles.progressLoading} role="status">
              Checking fulfilment…
            </span>
          )}
          {progressQuery.isError && (
            <span className={styles.progressError} role="status">
              Fulfilment progress unavailable
            </span>
          )}
          {progress && (
            <>
              <FulfillmentStatusBadge status={progress.status} />
              <p className={styles.progressSummary}>{fulfillmentProgressText(progress)}</p>
            </>
          )}
        </div>
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

          {isFulfilled ? (
            <p className={styles.asideText}>
              All {progress.totalItems} {progress.totalItems === 1 ? 'item has' : 'items have'}{' '}
              been dispensed. Nothing else is outstanding.
            </p>
          ) : isPartiallyFulfilled ? (
            <>
              <p className={styles.asideText}>
                {progress.dispensedItems} of {progress.totalItems} items are dispensed.
                You can collect the remaining items from another facility; that facility will
                only receive the items listed above as outstanding.
              </p>
              {outstandingItems.length > 0 && !hasRoutedItems ? (
                <Button type="button" onClick={() => setIsPickerOpen(true)}>
                  Get remaining items elsewhere
                </Button>
              ) : hasRoutedItems ? (
                <p className={styles.asideText}>
                  The remaining items have been routed. Check the item list for the receiving
                  facility.
                </p>
              ) : (
                <p className={styles.asideText}>
                  There are no outstanding items available to route. Items already dispensed
                  elsewhere cannot be moved again.
                </p>
              )}
            </>
          ) : (
            <p className={styles.asideText}>
              Nothing has been dispensed yet. Take this order to{' '}
              {order.facilityName ?? 'a participating facility'} to collect it. If only some
              items can be filled there, the rest can be routed elsewhere.
            </p>
          )}

          <p className={styles.asideFinePrint}>
            Progress comes from docforum-core, counted from the order&apos;s item rows. A
            partially filled order does not release the full escrow amount; the backend applies
            its partial-fulfilment release rule.
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
