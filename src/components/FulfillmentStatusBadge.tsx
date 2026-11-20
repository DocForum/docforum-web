import type { PartialFulfillmentStatus } from '../types/models';
import styles from './FulfillmentStatusBadge.module.css';

const LABELS: Record<PartialFulfillmentStatus, string> = {
  unfulfilled: 'Unfulfilled',
  partially_fulfilled: 'Partially filled',
  fulfilled: 'Fulfilled',
  rejected: 'Rejected',
};

export function FulfillmentStatusBadge({
  status,
  className,
}: {
  status: PartialFulfillmentStatus;
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

export function fulfillmentStatusLabel(status: PartialFulfillmentStatus): string {
  return LABELS[status];
}
