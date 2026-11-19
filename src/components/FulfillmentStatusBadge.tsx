import type { PartialFulfillmentStatus } from '../types/models';
import type { useT } from '../i18n/useT';
import styles from './FulfillmentStatusBadge.module.css';

type Translate = ReturnType<typeof useT>;
const identity: Translate = (_id, defaultMessage) => defaultMessage;


export function FulfillmentStatusBadge({
  status,
  className,
  t,
}: {
  status: PartialFulfillmentStatus;
  className?: string;
  /** When given, the label is read from the active catalogue. */
  t?: Translate;
}) {
  return (
    <span
      className={[styles.badge, styles[status], className].filter(Boolean).join(' ')}
      data-status={status}
    >
      {fulfillmentStatusLabel(status, t)}
    </span>
  );
}

export function fulfillmentStatusLabel(
  status: PartialFulfillmentStatus,
  t: Translate = identity,
): string {
  switch (status) {
    case 'unfulfilled':
      return t('orders.fulfillment.unfulfilled', 'Unfulfilled');
    case 'partially_fulfilled':
      return t('orders.fulfillment.partiallyFulfilled', 'Partially filled');
    case 'fulfilled':
      return t('orders.fulfillment.fulfilled', 'Fulfilled');
    case 'rejected':
      return t('orders.fulfillment.rejected', 'Rejected');
    default:
      return t('orders.fulfillment.unknown', 'Unknown status');
  }
}
