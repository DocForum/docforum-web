import type {
  FulfillmentQueueItem,
  OrderItemFulfillment,
  OrderItemFulfillmentStatus,
  PartialFulfillmentStatus,
} from '../../types/models';

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

export const ITEM_STATUS_LABELS: Record<OrderItemFulfillmentStatus, string> = {
  pending: 'Pending',
  partially_dispensed: 'Partially dispensed',
  dispensed: 'Dispensed',
  dispensed_elsewhere: 'Dispensed elsewhere',
  rejected: 'Rejected',
};
