import { Link } from 'react-router-dom';
import { useT } from '../../../i18n/useT';
import { ageTone, hoursSince, reasonLabel } from '../queue';
import { ageLabel, formatDateTime, formatDisputeAmount } from '../format';
import type { FulfillmentDisputeSummary } from '../../../types/models';
import styles from './Disputes.module.css';

const TONE_CLASS = {
  elevated: styles.ageElevated,
  high: styles.ageHigh,
  critical: styles.ageCritical,
} as const;

export function DisputeCard({ dispute, now }: { dispute: FulfillmentDisputeSummary; now: number }) {
  const t = useT();
  const hours = hoursSince(dispute.openedAt, now);
  const href = `/admin/disputes/${dispute.id}`;

  return (
    <article className={styles.card} aria-labelledby={`dispute-${dispute.id}`}>
      <div className={styles.cardTop}>
        <div className={styles.badges}>
          <span className={[styles.age, TONE_CLASS[ageTone(hours ?? 0)]].join(' ')}>
            {t('admin.disputes.openFor', 'Open {age}', { age: ageLabel(dispute.openedAt, now) })}
          </span>
          <span className={styles.reason}>{reasonLabel(dispute.reason, t)}</span>
        </div>
        <span className={styles.mono}>#{dispute.id}</span>
      </div>

      <h2 className={styles.cardTitle} id={`dispute-${dispute.id}`}>
        <Link to={href}>
          {dispute.itemName} —{' '}
          {dispute.orderType === 'prescription'
            ? t('payments.orderType.prescription', 'Prescription')
            : t('payments.orderType.labOrder', 'Lab order')}
        </Link>
      </h2>
      <p className={styles.cardMeta}>
        {t('admin.disputes.orderOpened', 'Order {orderId} · opened {date}', {
          orderId: dispute.orderId,
          date: formatDateTime(dispute.openedAt),
        })}
      </p>

      <dl className={styles.facts}>
        <div>
          <dt>{t('admin.disputes.facility', 'Facility')}</dt>
          <dd>{dispute.facility.name}</dd>
        </div>
        <div>
          <dt>{t('admin.disputes.patient', 'Patient')}</dt>
          <dd>{dispute.patientName}</dd>
        </div>
        <div>
          <dt>{t('admin.disputes.blockedInEscrow', 'Blocked in escrow')}</dt>
          <dd className={styles.amount}>{formatDisputeAmount(dispute.amountStroops, dispute.asset)}</dd>
        </div>
      </dl>

      <div className={styles.cardActions}>
        <Link to={href}>{t('admin.disputes.review', 'Review dispute')}</Link>
      </div>
    </article>
  );
}
