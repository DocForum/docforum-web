import type { PatientOrder } from '../../../types/models';
import { englishTranslator } from '../../../i18n/englishTranslator';
import type { Translator } from '../../../i18n/useT';

export function formatOrderDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function orderTypeLabel(order: PatientOrder, t: Translator = englishTranslator): string {
  return order.orderType === 'prescription'
    ? t('orders.detail.prescription', 'Prescription')
    : t('orders.detail.labOrder', 'Lab order');
}

/** Item count summary, including anything a facility has not filled yet. */
export function orderItemSummary(order: PatientOrder, t: Translator = englishTranslator): string {
  const items = order.items ?? [];
  const total = items.length;
  const outstanding = items.filter((item) => item.quantityOutstanding > 0).length;
  if (outstanding > 0) {
    return t(
      'orders.itemCountOutstanding',
      '{total, plural, one {1 item} other {# items}} · {outstanding, plural, one {1 still outstanding} other {# still outstanding}}',
      { total, outstanding },
    );
  }
  return t('orders.itemCount', '{total, plural, one {1 item} other {# items}}', { total });
}
