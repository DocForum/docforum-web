import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/Button';
import { FulfillmentStatusBadge } from '../../../components/FulfillmentStatusBadge';
import { Spinner } from '../../../components/Spinner';
import { useT } from '../../../i18n/useT';
import type { OrderItemFulfillment, OrderPaymentSummary, PatientOrder } from '../../../types/models';
import { useOrder } from '../hooks/useOrders';
import { orderTypeLabel } from './PatientOrdersList';
import { RemainingItemsFacilityPicker } from './RemainingItemsFacilityPicker';
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

/** Payment statuses are API identifiers mapped explicitly, never rendered raw. */
function paymentStatusLabel(status: OrderPaymentSummary['status'], t: Translate): string {
  switch (status) {
    case 'held':
      return t('payments.summaryStatus.held', 'Held in escrow');
    case 'partially_released':
      return t('payments.summaryStatus.partiallyReleased', 'Partially released');
    case 'released':
      return t('payments.summaryStatus.released', 'Released');
    case 'refunded':
      return t('payments.summaryStatus.refunded', 'Refunded');
    default:
      return t('payments.summaryStatus.none', 'No payment');
  }
}

function itemStatusLabel(status: OrderItemFulfillment['status'], t: Translate): string {
  switch (status) {
    case 'pending':
      return t('orders.itemStatus.pending', 'Pending');
    case 'partially_dispensed':
      return t('orders.itemStatus.partiallyDispensed', 'Partially dispensed');
    case 'dispensed':
      return t('orders.itemStatus.dispensed', 'Dispensed');
    case 'dispensed_elsewhere':
      return t('orders.itemStatus.dispensedElsewhere', 'Dispensed elsewhere');
    case 'rejected':
      return t('orders.itemStatus.rejected', 'Rejected');
    default:
      return t('orders.itemStatus.unknown', 'Unknown status');
  }
}

function ItemCard({ item }: { item: OrderItemFulfillment }) {
  const t = useT();
  const isOutstanding = item.quantityOutstanding > 0;

  return (
    <li className={styles.detailItem} data-status={item.status}>
      <div className={styles.detailItemHeader}>
        <div>
          {/* Medication names, doses and instructions are never translated. */}
          <h3 className={styles.detailItemName}>{item.name}</h3>
          {item.instructions && (
            <p className={styles.detailItemInstructions}>{item.instructions}</p>
          )}
        </div>
        <span className={styles.itemStatus} data-status={item.status}>
          {itemStatusLabel(item.status, t)}
        </span>
      </div>

      <dl
        className={styles.detailQuantities}
        aria-label={t('orders.detail.quantitiesAria', 'Quantities for {name}', { name: item.name })}
      >
        <div>
          <dt>{t('orders.detail.prescribed', 'Prescribed')}</dt>
          <dd>
            {item.quantityPrescribed} {item.unit}
          </dd>
        </div>
        <div>
          <dt>{t('orders.detail.dispensed', 'Dispensed')}</dt>
          <dd>
            {item.quantityDispensed} {item.unit}
          </dd>
        </div>
        <div>
          <dt>{t('orders.detail.outstanding', 'Outstanding')}</dt>
          <dd>
            {item.quantityOutstanding} {item.unit}
          </dd>
        </div>
      </dl>

      {item.status === 'dispensed_elsewhere' && (
        <p className={styles.warning} role="note">
          <strong>{t('orders.detail.dispensedElsewhereStrong', 'Dispensed elsewhere.')}</strong>{' '}
          {item.dispensedByFacilityName
            ? t(
                'orders.detail.dispensedElsewhereBy',
                'This item was already dispensed by {facility}.',
                { facility: item.dispensedByFacilityName },
              )
            : t(
                'orders.detail.dispensedElsewhereNoFacility',
                'This item was already dispensed at another facility.',
              )}{' '}
          {t('orders.detail.dispensedElsewhereTail', 'It cannot be dispensed again here.')}
        </p>
      )}

      {item.dispensedByFacilityName && item.status !== 'dispensed_elsewhere' && (
        <p className={styles.itemMeta}>
          {item.dispensedAt
            ? t('orders.detail.dispensedByOn', 'Dispensed by {facility} on {date}.', {
                facility: item.dispensedByFacilityName,
                date: formatDate(item.dispensedAt),
              })
            : t('orders.detail.dispensedBy', 'Dispensed by {facility}', {
                facility: item.dispensedByFacilityName,
              })}
        </p>
      )}

      {item.routedToFacilityName && (
        <p className={styles.routedNote} role="note">
          {t('orders.detail.routedNote', 'Remaining {quantity} {unit} routed to {facility}.', {
            quantity: item.quantityOutstanding,
            unit: item.unit,
            facility: item.routedToFacilityName,
          })}
        </p>
      )}

      {item.blockedReason && item.status !== 'dispensed_elsewhere' && (
        <p className={styles.warning} role="note">
          {item.blockedReason}
        </p>
      )}

      {isOutstanding && item.status !== 'rejected' && !item.routedToFacilityId && (
        <p className={styles.itemMeta}>
          {t('orders.detail.remaining', '{quantity} {unit} still to be dispensed.', {
            quantity: item.quantityOutstanding,
            unit: item.unit,
          })}
        </p>
      )}
    </li>
  );
}

export function PatientOrderDetail({ orderId }: { orderId: string }) {
  const t = useT();
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
  const allDispensed = (order?.items ?? []).every((item) => item.quantityOutstanding <= 0);

  if (isLoading) {
    return (
      <div className={styles.loading} role="status">
        <Spinner />
        <span>{t('orders.detail.loading', 'Loading order…')}</span>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className={styles.page}>
        <p className={styles.error} role="alert">
          {error instanceof Error ? error.message : t('orders.detail.error', 'Order not found.')}
        </p>
        <Link to="/patient/orders" className={styles.backLink}>
          {t('orders.detail.back', 'Back to my orders')}
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
        ? t(
            'orders.detail.routedSuccess',
            "Remaining items routed to {facility}. They are now on that facility's queue.",
            { facility: facilityName },
          )
        : t(
            'orders.detail.routedSuccessGeneric',
            'Remaining items routed to another facility.',
          ),
    );
  };

  return (
    <section className={styles.page} aria-labelledby="order-detail-heading">
      <Link to="/patient/orders" className={styles.backLink}>
        {t('orders.detail.backArrow', '← Back to my orders')}
      </Link>

      <div className={styles.detailHeader}>
        <div>
          <p className={styles.orderType}>{orderTypeLabel(order, t)}</p>
          <h1 id="order-detail-heading" className={styles.detailTitle}>
            {order.medicationOrTest}
          </h1>
          <p className={styles.orderMeta}>
            {order.facilityName
              ? t(
                  'orders.detail.orderMetaWithFacility',
                  'Order {orderId} · issued {date} · {facility}',
                  {
                    orderId: order.id,
                    date: formatDate(order.issuedAt),
                    facility: order.facilityName,
                  },
                )
              : t('orders.detail.orderMeta', 'Order {orderId} · issued {date}', {
                  orderId: order.id,
                  date: formatDate(order.issuedAt),
                })}
          </p>
        </div>
        <FulfillmentStatusBadge status={order.fulfillmentStatus ?? 'unfulfilled'} t={t} />
      </div>

      <div className={styles.paymentCallout} role="note">
        <div>
          <strong>{t('orders.detail.paymentImplications', 'Payment implications')}</strong>
          <p>
            {order.payment?.rule ??
              t(
                'orders.detail.paymentRuleFallback',
                'Payment details are not available for this order.',
              )}
          </p>
        </div>
        <span className={styles.paymentStatus}>
          {paymentStatusLabel(order.payment?.status ?? 'none', t)}
        </span>
      </div>

      {successMessage && (
        <p className={styles.success} role="status">
          {successMessage}
        </p>
      )}

      <div className={styles.detailBody}>
        <div className={styles.itemSection}>
          <h2 className={styles.sectionTitle}>{t('orders.detail.sectionItems', 'Items')}</h2>
          <ul className={styles.detailItemList}>
            {(order.items ?? []).map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </ul>
        </div>

        <aside className={styles.detailAside}>
          <h2 className={styles.sectionTitle}>
            {t('orders.detail.whatNext', 'What happens next?')}
          </h2>
          {allDispensed ? (
            <p className={styles.asideText}>
              {t(
                'orders.detail.allDispensed',
                'All items on this order have been dispensed. Nothing else is outstanding.',
              )}
            </p>
          ) : outstandingItems.length > 0 ? (
            <>
              <p className={styles.asideText}>
                {t(
                  'orders.detail.collectElsewhere',
                  'You can collect the outstanding items from another facility. That facility will only receive the items listed here.',
                )}
              </p>
              <Button type="button" onClick={() => setIsPickerOpen(true)}>
                {t('orders.detail.getRemaining', 'Get remaining items elsewhere')}
              </Button>
            </>
          ) : hasRoutedItems ? (
            <p className={styles.asideText}>
              {t(
                'orders.detail.routedCheck',
                'The remaining items have been routed. Check the item list for the receiving facility.',
              )}
            </p>
          ) : (
            <p className={styles.asideText}>
              {t(
                'orders.detail.nothingToRoute',
                'There are no outstanding items available to route. Items already dispensed elsewhere cannot be moved again.',
              )}
            </p>
          )}

          <p className={styles.asideFinePrint}>
            {t(
              'orders.detail.finePrint',
              "A partially filled order does not release the full escrow amount. DocForum's backend applies its partial-fulfilment release rule; this screen shows the rule it returns rather than calculating a payout.",
            )}
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
