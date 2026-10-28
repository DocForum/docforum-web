import { useMemo, useState } from 'react';
import { Button } from '../../../components/Button';
import { FormError } from '../../../components/FormError';
import { FulfillmentStatusBadge } from '../../../components/FulfillmentStatusBadge';
import { TextField } from '../../../components/TextField';
import type { FulfillmentQueueItem } from '../../../types/models';
import {
  ITEM_STATUS_LABELS,
  deriveOrderFulfillmentStatus,
  itemFulfillmentStatus,
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
  const { prescribed, dispensed, outstanding } = quantities(item);
  const status = itemFulfillmentStatus(item);
  const [quantity, setQuantity] = useState(outstanding);
  const [localError, setLocalError] = useState<string | null>(null);

  const canDispense = (item.canDispense ?? true) && outstanding > 0 && status !== 'rejected';

  const handleDispense = async () => {
    if (!Number.isInteger(quantity) || quantity < 1) {
      setLocalError('Enter a whole number of at least 1.');
      return;
    }
    if (quantity > outstanding) {
      setLocalError(`You can dispense at most ${outstanding} ${item.unit ?? 'unit(s)'}.`);
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
          {ITEM_STATUS_LABELS[status]}
        </span>
      </div>

      <dl className={styles.quantityList} aria-label={`Quantities for ${item.itemName}`}>
        <div>
          <dt>Prescribed</dt>
          <dd>
            {prescribed} {item.unit ?? 'unit(s)'}
          </dd>
        </div>
        <div>
          <dt>Dispensed</dt>
          <dd>
            {dispensed} {item.unit ?? 'unit(s)'}
          </dd>
        </div>
        <div>
          <dt>Outstanding</dt>
          <dd>
            {outstanding} {item.unit ?? 'unit(s)'}
          </dd>
        </div>
      </dl>

      {status === 'dispensed_elsewhere' ? (
        <p className={styles.warning} role="note">
          <strong>Already dispensed elsewhere.</strong>{' '}
          {item.dispensedByFacilityName
            ? `Dispensed by ${item.dispensedByFacilityName}.`
            : 'Another facility dispensed this item.'}{' '}
          You cannot dispense it again.
        </p>
      ) : item.blockedReason ? (
        <p className={styles.warning} role="note">
          {item.blockedReason}
        </p>
      ) : null}

      {item.attribution && (
        <p className={styles.attribution}>
          Last action: {item.attribution.action.replace('_', ' ')} by{' '}
          <strong>{item.attribution.performedByName}</strong> on{' '}
          {new Date(item.attribution.timestamp).toLocaleString()}
          {item.attribution.notes ? ` — “${item.attribution.notes}”` : ''}
        </p>
      )}

      {canDispense ? (
        <div className={styles.dispenseControls}>
          <div className={styles.quantityInput}>
            <TextField
              label={`Quantity of ${item.itemName} to dispense`}
              type="number"
              min={1}
              max={outstanding}
              step={1}
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value))}
              disabled={isDispensing}
            />
            <span className={styles.unitHint}>of {outstanding} outstanding</span>
          </div>
          <div className={styles.rowActions}>
            {onReject && (
              <Button
                type="button"
                variant="secondary"
                loading={isRejecting}
                disabled={isDispensing || isRejecting}
                onClick={() => onReject(item.id)}
                aria-label={`Reject ${item.itemName}`}
                className={styles.rejectButton}
              >
                Reject item
              </Button>
            )}
            <Button
              type="button"
              loading={isDispensing}
              disabled={isDispensing || isRejecting}
              onClick={handleDispense}
              aria-label={`Dispense ${item.itemName}`}
            >
              Dispense item
            </Button>
          </div>
        </div>
      ) : outstanding === 0 && status !== 'rejected' ? (
        <p className={styles.doneNote}>No quantity outstanding for this item.</p>
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
  const groups = useMemo(() => groupByOrder(items), [items]);

  return (
    <section className={styles.card} aria-labelledby="fulfillment-heading">
      <div className={styles.header}>
        <div>
          <h2 id="fulfillment-heading">Fulfillment queue</h2>
          <p className={styles.subtitle}>
            Dispense items individually and record exactly what you supplied. The patient can
            route anything left to another facility.
          </p>
        </div>
      </div>

      <div className={styles.paymentCallout} role="note">
        <strong>Partial fulfilment &amp; payment:</strong> dispensing part of an order does not
        release the full escrow amount. Payment stays held until the backend&apos;s release rule
        for the order is met; each facility is paid only for the items it dispenses.
      </div>

      <FormError message={errorMessage} />

      {groups.length === 0 ? (
        <p className={styles.emptyState}>No items in the fulfillment queue.</p>
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
                        {group.orderType === 'prescription' ? 'Prescription' : 'Lab order'} for{' '}
                        {group.patientName}
                      </h3>
                      <FulfillmentStatusBadge status={status} />
                    </div>
                    <p className={styles.orderMeta}>
                      Order {group.orderId} · received{' '}
                      {new Date(group.receivedAt).toLocaleDateString()}
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
