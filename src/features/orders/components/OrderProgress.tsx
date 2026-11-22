import type { OrderFulfillmentProgress, PatientOrder } from '../../../types/models';
import { FulfillmentStatusBadge } from '../../../components/FulfillmentStatusBadge';
import { useOrderFulfillmentProgress } from '../hooks/useOrders';
import styles from './PatientOrders.module.css';

/** The summary text every screen pairs with the badge (never colour-only). */
export function fulfillmentProgressText(progress: OrderFulfillmentProgress): string {
  const noun = progress.totalItems === 1 ? 'item' : 'items';
  return `${progress.dispensedItems} of ${progress.totalItems} ${noun} dispensed`;
}

/**
 * Compact progress for the orders list. It reads the dedicated endpoint,
 * keyed per order and type, rather than guessing from cached item rows.
 */
export function OrderProgress({ order }: { order: PatientOrder }) {
  const { data, isLoading, isError } = useOrderFulfillmentProgress(order);

  if (isLoading) {
    return (
      <span className={styles.progressLoading} role="status">
        Checking fulfilment…
      </span>
    );
  }

  if (isError || !data) {
    return (
      <span className={styles.progressError} role="status">
        Fulfilment progress unavailable
      </span>
    );
  }

  return (
    <span className={styles.progressRow}>
      <FulfillmentStatusBadge
        status={data.status === 'issued' ? 'unfulfilled' : data.status}
      />
      <span className={styles.progressText}>{fulfillmentProgressText(data)}</span>
    </span>
  );
}
