import type { OrderFulfillmentProgressStatus } from '../types/models';
import styles from './FulfillmentStatusBadge.module.css';

const LABELS: Record<OrderFulfillmentProgressStatus, string> = {
  issued: 'Issued',
  partially_fulfilled: 'Partially filled',
  fulfilled: 'Fulfilled',
};

/**
 * Progress is never colour-only: the badge always renders the status as
 * text, and the screen pairs it with "2 of 3 items dispensed".
 */
export function FulfillmentStatusBadge({
  status,
  className,
}: {
  status: OrderFulfillmentProgressStatus;
  className?: string;
}) {
  return (
    <span
      className={[styles.badge, styles[status], className].filter(Boolean).join(' ')}
      data-status={status}
    >
      {LABELS[status]}
    </span>
  );
}

export function fulfillmentStatusLabel(status: OrderFulfillmentProgressStatus): string {
  return LABELS[status];
}
