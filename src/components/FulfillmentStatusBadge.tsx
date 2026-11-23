import type { PartialFulfillmentStatus } from '../types/models';
import { useT, type Translator } from '../i18n/useT';
import { englishTranslator } from '../i18n/englishTranslator';
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
  const t = useT();
  return (
    <span
      className={[styles.badge, styles[status], className].filter(Boolean).join(' ')}
      data-status={status}
    >
      {fulfillmentStatusLabel(status, t)}
    </span>
  );
}

export function fulfillmentStatusLabel(status: PartialFulfillmentStatus, t: Translator = englishTranslator): string {
  return t(`orders.fulfillmentStatus.${status}`, LABELS[status] ?? status);
}
