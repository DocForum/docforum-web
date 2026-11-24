import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { Button } from '../../../components/Button';
import { FormError } from '../../../components/FormError';
import { FulfillmentStatusBadge } from '../../../components/FulfillmentStatusBadge';
import { TextField } from '../../../components/TextField';
import type { FulfillmentQueueItem } from '../../../types/models';
import { useT } from '../../../i18n/useT';
import {
  deriveOrderFulfillmentStatus,
  itemFulfillmentStatus,
  useItemStatusLabel,
} from '../status';
import styles from './Fulfillment.module.css';

interface FacilityFulfillmentQueueProps {
  items: FulfillmentQueueItem[];
  isDispensing: boolean;
  isRejecting?: boolean;
  errorMessage?: string | null;
  onDispense: (itemId: string, quantity: number) => Promise<unknown>;
  onReject?: (itemId: string) => Promise<unknown>;
}

interface OrderGroup {
  orderId: string;
  patientName: string;
  orderType: FulfillmentQueueItem['orderType'];
  receivedAt: string;
  items: FulfillmentQueueItem[];
}

function quantities(item: FulfillmentQueueItem) {
  const prescribed = item.quantityPrescribed ?? 1;
  const dispensed =
    item.quantityDispensed ?? (item.status === 'fulfilled' ? prescribed : 0);
  const outstanding =
    item.quantityOutstanding ?? Math.max(0, prescribed - dispensed);
  return { prescribed, dispensed, outstanding };
}

function groupByOrder(items: FulfillmentQueueItem[]): OrderGroup[] {
  const groups = new Map<string, OrderGroup>();
  for (const item of items) {
    const existing = groups.get(item.orderId);
    if (existing) {
      existing.items.push(item);
    } else {
      groups.set(item.orderId, {
        orderId: item.orderId,
        patientName: item.patientName,
        orderType: item.orderType,
        receivedAt: item.receivedAt,
        items: [item],
      });
    }
  }
  return [...groups.values()];
}

function DispenseItemRow({
  item,
  isDispensing,
  isRejecting,
  onDispense,
  onReject,
}: {
  item: FulfillmentQueueItem;
  isDispensing: boolean;
  isRejecting: boolean;
  onDispense: (itemId: string, quantity: number) => Promise<unknown>;
  onReject?: (itemId: string) => Promise<unknown>;
}) {
  const t = useT();
  const { locale } = useIntl();
  const { prescribed, dispensed, outstanding } = quantities(item);
  const status = itemFulfillmentStatus(item);
  const statusLabel = useItemStatusLabel(status);
  const [quantity, setQuantity] = useState(outstanding);
  const [localError, setLocalError] = useState<string | null>(null);

  const canDispense = (item.canDispense ?? true) && outstanding > 0 && status !== 'rejected';

  const handleDispense = async () => {
    if (!Number.isInteger(quantity) || quantity < 1) {
      setLocalError(t('fulfillment.dispense.wholeNumber', 'Enter a whole number of at least 1.'));
      return;
    }
    if (quantity > outstanding) {
      setLocalError(
        t('fulfillment.dispense.maxQuantity', 'You can dispense at most {count} {unit}.', {
          count: outstanding,
          unit: item.unit ?? t('fulfillment.dispense.unitFallback', 'unit(s)'),
        }),
      );
      return;
    }
    setLocalError(null);
    try {
      await onDispense(item.id, quantity);
    } catch {
      // The parent renders the mutation error (including a backend 409).
    }
  };

  return (
    <li className={styles.itemRow}>
      <div className={styles.itemTop}>
        <div>
          <p className={styles.itemName}>{item.itemName}</p>
          {item.instructions && <p className={styles.itemInstructions}>{item.instructions}</p>}
        </div>
        <span className={styles.itemStatus} data-status={status}>
          {statusLabel}
        </span>
      </div>

      <dl className={styles.quantityList} aria-label={t('fulfillment.dispense.quantitiesLabel', 'Quantities for {item}', { item: item.itemName })}>
        <div>
          <dt>{t('fulfillment.dispense.prescribed', 'Prescribed')}</dt>
          <dd>
            {prescribed} {item.unit ?? t('fulfillment.dispense.unitFallback', 'unit(s)')}
          </dd>
        </div>
        <div>
          <dt>{t('fulfillment.dispense.dispensed', 'Dispensed')}</dt>
          <dd>
            {dispensed} {item.unit ?? t('fulfillment.dispense.unitFallback', 'unit(s)')}
          </dd>
        </div>
        <div>
          <dt>{t('fulfillment.dispense.outstanding', 'Outstanding')}</dt>
          <dd>
            {outstanding} {item.unit ?? t('fulfillment.dispense.unitFallback', 'unit(s)')}
          </dd>
        </div>
      </dl>

      {status === 'dispensed_elsewhere' ? (
        <p className={styles.warning} role="note">
          <strong>{t('fulfillment.dispense.alreadyElsewhere', 'Already dispensed elsewhere.')}</strong>{' '}
          {item.dispensedByFacilityName
            ? t('fulfillment.dispense.dispensedBy', 'Dispensed by {facility}.', { facility: item.dispensedByFacilityName })
            : t('fulfillment.dispense.anotherFacility', 'Another facility dispensed this item.')}{' '}
          {t('fulfillment.dispense.cannotRepeat', 'You cannot dispense it again.')}
        </p>
      ) : item.blockedReason ? (
        <p className={styles.warning} role="note">
          {item.blockedReason}
        </p>
      ) : null}

      {item.attribution && (
        <p className={styles.attribution}>
          {t('fulfillment.dispense.lastAction', 'Last action: {action} by {name} on {date}', {
            action: item.attribution.action.replace('_', ' '),
            name: item.attribution.performedByName,
            date: new Date(item.attribution.timestamp).toLocaleString(locale),
          })}
          {item.attribution.notes ? ' — ' + t('fulfillment.dispense.notes', '“{notes}”', { notes: item.attribution.notes }) : ''}
        </p>
      )}

      {canDispense ? (
        <div className={styles.dispenseControls}>
          <div className={styles.quantityInput}>
            <TextField
              label={t('fulfillment.dispense.quantityFor', 'Quantity of {item} to dispense', { item: item.itemName })}
              type="number"
              min={1}
              max={outstanding}
              step={1}
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value))}
              disabled={isDispensing}
            />
            <span className={styles.unitHint}>
              {t('fulfillment.dispense.ofOutstanding', 'of {count} outstanding', { count: outstanding })}
            </span>
          </div>
          <div className={styles.rowActions}>
            {onReject && (
              <Button
                type="button"
                variant="secondary"
                loading={isRejecting}
                disabled={isDispensing || isRejecting}
                onClick={() => onReject(item.id)}
                aria-label={t('fulfillment.dispense.rejectItemName', 'Reject {item}', { item: item.itemName })}
                className={styles.rejectButton}
              >
                {t('fulfillment.dispense.rejectItem', 'Reject item')}
              </Button>
            )}
            <Button
              type="button"
              loading={isDispensing}
              disabled={isDispensing || isRejecting}
              onClick={handleDispense}
              aria-label={t('fulfillment.dispense.dispenseItemName', 'Dispense {item}', { item: item.itemName })}
            >
              {t('fulfillment.dispense.dispenseItem', 'Dispense item')}
            </Button>
          </div>
        </div>
      ) : outstanding === 0 && status !== 'rejected' ? (
        <p className={styles.doneNote}>{t('fulfillment.dispense.nothingOutstanding', 'No quantity outstanding for this item.')}</p>
      ) : null}

      {localError && <FormError message={localError} />}
    </li>
  );
}

export function FacilityFulfillmentQueue({
  items,
  isDispensing,
  isRejecting = false,
  errorMessage = null,
  onDispense,
  onReject,
}: FacilityFulfillmentQueueProps) {
  const t = useT();
  const { locale } = useIntl();
  const groups = useMemo(() => groupByOrder(items), [items]);

  return (
    <section className={styles.card} aria-labelledby="fulfillment-heading">
      <div className={styles.header}>
        <div>
          <h2 id="fulfillment-heading">{t('fulfillment.queue.title', 'Fulfillment queue')}</h2>
          <p className={styles.subtitle}>
            {t('fulfillment.queue.subtitle', 'Dispense items individually and record exactly what you supplied. The patient can route anything left to another facility.')}
          </p>
        </div>
      </div>

      <div className={styles.paymentCallout} role="note">
        <strong>{t('fulfillment.queue.paymentLabel', 'Partial fulfilment & payment:')}</strong>{' '}
        {t('fulfillment.queue.paymentText', 'dispensing part of an order does not release the full escrow amount. Payment stays held until the backend\'s release rule for the order is met; each facility is paid only for the items it dispenses.')}
      </div>

      <FormError message={errorMessage} />

      {groups.length === 0 ? (
        <p className={styles.emptyState}>{t('fulfillment.queue.empty', 'No items in the fulfillment queue.')}</p>
      ) : (
        <div className={styles.orderList}>
          {groups.map((group) => {
            const status = deriveOrderFulfillmentStatus(group.items);
            return (
              <article key={group.orderId} className={styles.orderCard}>
                <header className={styles.orderHeader}>
                  <div>
                    <div className={styles.orderTitleRow}>
                      <h3 className={styles.orderTitle}>
                        {group.orderType === 'prescription'
                          ? t('fulfillment.queue.prescription', 'Prescription')
                          : t('fulfillment.queue.labOrder', 'Lab order')}{' '}
                        {t('fulfillment.queue.forPatient', 'for {patient}', { patient: group.patientName })}
                      </h3>
                      <FulfillmentStatusBadge status={status} />
                    </div>
                    <p className={styles.orderMeta}>
                      {t('fulfillment.queue.orderReceived', 'Order {orderId} · received {date}', {
                        orderId: group.orderId,
                        date: new Date(group.receivedAt).toLocaleDateString(locale),
                      })}
                    </p>
                  </div>
                </header>
                <ul className={styles.itemList}>
                  {group.items.map((item) => {
                    const { dispensed, outstanding } = quantities(item);
                    return (
                      <DispenseItemRow
                        key={`${item.id}:${dispensed}:${outstanding}`}
                        item={item}
                        isDispensing={isDispensing}
                        isRejecting={isRejecting}
                        onDispense={onDispense}
                        onReject={onReject}
                      />
                    );
                  })}
                </ul>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
