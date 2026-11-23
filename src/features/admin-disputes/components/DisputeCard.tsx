import { Link } from 'react-router-dom';
import { ageTone, hoursSince, reasonLabel } from '../queue';
import { ageLabel, formatDisputeAmount } from '../format';
import type { FulfillmentDisputeSummary } from '../../../types/models';
import { useFormatters } from '../../../i18n/formatters';
import { useT } from '../../../i18n/useT';
import styles from './Disputes.module.css';

const TONE_CLASS = {
  elevated: styles.ageElevated,
  high: styles.ageHigh,
  critical: styles.ageCritical,
} as const;

export function DisputeCard({ dispute, now }: { dispute: FulfillmentDisputeSummary; now: number }) {
  const t = useT();
  const { dateTime } = useFormatters();
  const hours = hoursSince(dispute.openedAt, now);
  const href = `/admin/disputes/${dispute.id}`;

  return (
    <article className={styles.card} aria-labelledby={`dispute-${dispute.id}`}>
      <div className={styles.cardTop}>
        <div className={styles.badges}>
          <span className={[styles.age, TONE_CLASS[ageTone(hours ?? 0)]].join(' ')}>
            {t('adminDisputes.openAge', 'Open {age}', { age: ageLabel(dispute.openedAt, now, t) })}
          </span>
          <span className={styles.reason}>{reasonLabel(dispute.reason, t)}</span>
        </div>
        <span className={styles.mono}>#{dispute.id}</span>
      </div>

      <h2 className={styles.cardTitle} id={`dispute-${dispute.id}`}>
        <Link to={href}>
          {dispute.itemName} — {dispute.orderType === 'prescription'
            ? t('payments.orderType.prescription', 'prescription')
            : t('payments.orderType.labOrder', 'lab order')}
        </Link>
      </h2>
      <p className={styles.cardMeta}>
        {t('adminDisputes.orderMeta', 'Order {id} · opened {date}', { id: dispute.orderId, date: dateTime(dispute.openedAt) })}
      </p>

      <dl className={styles.facts}>
        <div>
          <dt>{t('adminDisputes.facility', 'Facility')}</dt>
          <dd>{dispute.facility.name}</dd>
        </div>
        <div>
          <dt>{t('adminDisputes.patient', 'Patient')}</dt>
          <dd>{dispute.patientName}</dd>
        </div>
        <div>
          <dt>{t('adminDisputes.blockedAmount', 'Blocked in escrow')}</dt>
          <dd className={styles.amount}>{formatDisputeAmount(dispute.amountStroops, dispute.asset)}</dd>
        </div>
      </dl>

      <div className={styles.cardActions}>
        <Link to={href}>{t('adminDisputes.review', 'Review dispute')}</Link>
      </div>
    </article>
  );
}
