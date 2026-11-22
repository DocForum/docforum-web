import { useMemo, useState } from 'react';
import { Button } from '../../../components/Button';
import { useT, type Translator } from '../../../i18n/useT';
import type { OrderItemFulfillment, OrderPaymentSummary, PatientOrder } from '../../../types/models';
import { useItemStatusLabel } from '../../fulfillment/status';
import { formatOrderDate } from './order-display';
import { RemainingItemsFacilityPicker } from './RemainingItemsFacilityPicker';
import styles from './OrderFulfillment.module.css';

function paymentStatusLabel(status: OrderPaymentSummary['status'], t: Translator): string {
  switch (status) {
    case 'held':
      return t('orders.paymentStatus.held', 'Held in escrow');
    case 'partially_released':
      return t('orders.paymentStatus.partiallyReleased', 'Partially released');
    case 'released':
      return t('orders.paymentStatus.released', 'Released');
    case 'refunded':
      return t('orders.paymentStatus.refunded', 'Refunded');
    default:
      return t('orders.paymentStatus.none', 'No payment');
  }
}

function ItemCard({ item, t }: { item: OrderItemFulfillment; t: Translator }) {
  const statusLabel = useItemStatusLabel(item.status);
  const isOutstanding = item.quantityOutstanding > 0;

  return (
    <li className={styles.detailItem} data-status={item.status}>
      <div className={styles.detailItemHeader}>
        <div>
          <h4 className={styles.detailItemName}>{item.name}</h4>
          {item.instructions && (
            <p className={styles.detailItemInstructions}>{item.instructions}</p>
          )}
        </div>
        <span className={styles.itemStatus} data-status={item.status}>
          {statusLabel}
        </span>
      </div>

      <dl
        className={styles.detailQuantities}
        aria-label={t('orders.detail.quantitiesFor', 'Quantities for {name}', { name: item.name })}
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
          <strong>{t('orders.detail.dispensedElsewhere', 'Dispensed elsewhere.')}</strong>{' '}
          {item.dispensedByFacilityName
            ? t('orders.detail.alreadyDispensedBy', 'This item was already dispensed by {facility}.', {
                facility: item.dispensedByFacilityName,
              })
            : t('orders.detail.alreadyDispensedElsewhere', 'This item was already dispensed at another facility.')}{' '}
          {t('orders.detail.cannotDispenseAgain', 'It cannot be dispensed again here.')}
        </p>
      )}

      {item.dispensedByFacilityName && item.status !== 'dispensed_elsewhere' && (
        <p className={styles.itemMeta}>
          {t('orders.detail.dispensedBy', 'Dispensed by {facility}', {
            facility: item.dispensedByFacilityName,
          })}
          {item.dispensedAt
            ? t('orders.detail.dispensedOn', ' on {date}', {
                date: formatOrderDate(item.dispensedAt),
              })
            : ''}
          .
        </p>
      )}

      {item.routedToFacilityName && (
        <p className={styles.routedNote} role="note">
          {t('orders.detail.routed', 'Remaining {quantity} {unit} routed to {facility}.', {
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
          {t('orders.detail.stillToDispense', '{quantity} {unit} still to be dispensed.', {
            quantity: item.quantityOutstanding,
            unit: item.unit,
          })}
        </p>
      )}
    </li>
  );
}

/** Item-level fulfilment, payment implications and the partial-fulfilment
 * picker for a patient order. Kept separate from the QR/print card so the
 * single order detail page can compose both without duplicating the request
 * for the patient order. Loading and error states live in OrderDetailPage. */
export function OrderFulfillment({ order }: { order: PatientOrder }) {
  const t = useT();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const outstandingItems = useMemo(
    () =>
      (order.items ?? []).filter(
        (item) => item.quantityOutstanding > 0 && !item.routedToFacilityId,
      ),
    [order],
  );

  const hasRoutedItems = (order.items ?? []).some((item) => item.routedToFacilityId);
  const allDispensed = (order.items ?? []).every((item) => item.quantityOutstanding <= 0);

  const handleRouted = (updated: PatientOrder) => {
    setIsPickerOpen(false);
    const facilityName = (updated.items ?? []).find((item) => item.routedToFacilityName)
      ?.routedToFacilityName;
    setSuccessMessage(
      facilityName
        ? t('orders.detail.routedSuccess', 'Remaining items routed to {facility}. They are now on that facility’s queue.', {
            facility: facilityName,
          })
        : t('orders.detail.routedSuccessUnknown', 'Remaining items routed to another facility.'),
    );
  };

  return (
    <section className={styles.page} aria-labelledby="order-fulfillment-heading">
      <h2 id="order-fulfillment-heading" className={styles.sectionTitle}>
        {t('orders.fulfillment.heading', 'Items & fulfillment')}
      </h2>

      <div className={styles.paymentCallout} role="note">
        <div>
          <strong>{t('orders.detail.paymentImplications', 'Payment implications')}</strong>
          <p>{order.payment?.rule ?? t('orders.detail.paymentUnavailable', 'Payment details are not available for this order.')}</p>
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
          <h3 className={styles.sectionTitle}>{t('orders.detail.items', 'Items')}</h3>
          <ul className={styles.detailItemList}>
            {(order.items ?? []).map((item) => (
              <ItemCard key={item.id} item={item} t={t} />
            ))}
          </ul>
        </div>

        <aside className={styles.detailAside}>
          <h3 className={styles.sectionTitle}>{t('orders.detail.nextHeading', 'What happens next?')}</h3>
          {allDispensed ? (
            <p className={styles.asideText}>
              {t('orders.detail.allDispensed', 'All items on this order have been dispensed. Nothing else is outstanding.')}
            </p>
          ) : outstandingItems.length > 0 ? (
            <>
              <p className={styles.asideText}>
                {t('orders.detail.collectElsewhere', 'You can collect the outstanding items from another facility. That facility will only receive the items listed here.')}
              </p>
              <Button type="button" onClick={() => setIsPickerOpen(true)}>
                {t('orders.detail.getRemaining', 'Get remaining items elsewhere')}
              </Button>
            </>
          ) : hasRoutedItems ? (
            <p className={styles.asideText}>
              {t('orders.detail.routedNote', 'The remaining items have been routed. Check the item list for the receiving facility.')}
            </p>
          ) : (
            <p className={styles.asideText}>
              {t('orders.detail.noRouteItems', 'There are no outstanding items available to route. Items already dispensed elsewhere cannot be moved again.')}
            </p>
          )}

          <p className={styles.asideFinePrint}>
            {t('orders.detail.paymentDisclaimer', 'A partially filled order does not release the full escrow amount. DocForum’s backend applies its partial-fulfilment release rule; this screen shows the rule it returns rather than calculating a payout.')}
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
