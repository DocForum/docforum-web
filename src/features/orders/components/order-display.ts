import type { PatientOrder } from '../../../types/models';

export function formatOrderDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function orderTypeLabel(order: PatientOrder): string {
  return order.orderType === 'prescription' ? 'Prescription' : 'Lab order';
}

/** Item count summary, including anything a facility has not filled yet. */
export function orderItemSummary(order: PatientOrder): string {
  const items = order.items ?? [];
  const total = items.length;
  const outstanding = items.filter((item) => item.quantityOutstanding > 0).length;
  if (total === 1) return '1 item';
  if (outstanding > 0) return `${total} items · ${outstanding} still outstanding`;
  return `${total} items`;
}
