import type {
  FulfillmentQueueItem,
  OrderItemFulfillment,
  OrderItemFulfillmentStatus,
  PartialFulfillmentStatus,
} from '../../types/models';
import { useT } from '../../i18n/useT';
import enMessages from '../../i18n/messages/en.json';

type FulfillmentQuantity = Pick<
  FulfillmentQueueItem,
  'status' | 'quantityPrescribed' | 'quantityDispensed' | 'quantityOutstanding'
>;

/** Item-level status derived from quantities when the backend omits it. */
export function itemFulfillmentStatus(item: FulfillmentQuantity): OrderItemFulfillmentStatus {
  if (item.status === 'rejected') return 'rejected';
  if (item.status === 'dispensed_elsewhere') return 'dispensed_elsewhere';
  if (item.status === 'partially_dispensed') return 'partially_dispensed';
  if (item.status === 'fulfilled') return 'dispensed';

  const prescribed = item.quantityPrescribed ?? 1;
  const dispensed = item.quantityDispensed ?? 0;
  const outstanding =
    item.quantityOutstanding ?? Math.max(0, prescribed - dispensed);

  if (outstanding <= 0) return 'dispensed';
  if (dispensed > 0) return 'partially_dispensed';
  return 'pending';
}

/** Order-level status derived from item-level rows (docforum-core#73). */
export function deriveOrderFulfillmentStatus(
  items: Array<FulfillmentQuantity | OrderItemFulfillment>,
): PartialFulfillmentStatus {
  if (items.length === 0) return 'unfulfilled';

  const statuses = items.map((item) =>
    'name' in item
      ? (item as OrderItemFulfillment).status
      : itemFulfillmentStatus(item as FulfillmentQuantity),
  );

  if (statuses.every((status) => status === 'rejected')) return 'rejected';

  const settled = statuses.every(
    (status) => status === 'dispensed' || status === 'dispensed_elsewhere',
  );
  if (settled) return 'fulfilled';

  const started = statuses.some(
    (status) =>
      status === 'dispensed' ||
      status === 'dispensed_elsewhere' ||
      status === 'partially_dispensed',
  );
  return started ? 'partially_fulfilled' : 'unfulfilled';
}

/**
 * Kept for the (out-of-scope) patient order detail screen, which imports this
 * record directly. The labels now come from the catalogue rather than being
 * duplicated as literals here; components in this feature use the translated
 * hook below so API status identifiers never leak into the UI as raw labels.
 */
export const ITEM_STATUS_LABELS: Record<OrderItemFulfillmentStatus, string> = {
  pending: enMessages['fulfillment.status.pending'],
  partially_dispensed: enMessages['fulfillment.status.partiallyDispensed'],
  dispensed: enMessages['fulfillment.status.dispensed'],
  dispensed_elsewhere: enMessages['fulfillment.status.dispensedElsewhere'],
  rejected: enMessages['fulfillment.status.rejected'],
};

/** Resolve each API status identifier to its own catalogue message. */
export function useItemStatusLabel(status: OrderItemFulfillmentStatus): string {
  const t = useT();
  switch (status) {
    case 'pending':
      return t('fulfillment.status.pending', 'Pending');
    case 'partially_dispensed':
      return t('fulfillment.status.partiallyDispensed', 'Partially dispensed');
    case 'dispensed':
      return t('fulfillment.status.dispensed', 'Dispensed');
    case 'dispensed_elsewhere':
      return t('fulfillment.status.dispensedElsewhere', 'Dispensed elsewhere');
    case 'rejected':
      return t('fulfillment.status.rejected', 'Rejected');
  }
}
