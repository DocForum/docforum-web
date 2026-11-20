import { Link } from 'react-router-dom';
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
  const hours = hoursSince(dispute.openedAt, now);
  const href = `/admin/disputes/${dispute.id}`;

  return (
    <article className={styles.card} aria-labelledby={`dispute-${dispute.id}`}>
      <div className={styles.cardTop}>
        <div className={styles.badges}>
          <span className={[styles.age, TONE_CLASS[ageTone(hours ?? 0)]].join(' ')}>
            Open {ageLabel(dispute.openedAt, now)}
          </span>
          <span className={styles.reason}>{reasonLabel(dispute.reason)}</span>
        </div>
        <span className={styles.mono}>#{dispute.id}</span>
      </div>

      <h2 className={styles.cardTitle} id={`dispute-${dispute.id}`}>
        <Link to={href}>
          {dispute.itemName} — {dispute.orderType === 'prescription' ? 'prescription' : 'lab order'}
        </Link>
      </h2>
      <p className={styles.cardMeta}>
        Order <code>{dispute.orderId}</code> · opened {formatDateTime(dispute.openedAt)}
      </p>

      <dl className={styles.facts}>
        <div>
          <dt>Facility</dt>
          <dd>{dispute.facility.name}</dd>
        </div>
        <div>
          <dt>Patient</dt>
          <dd>{dispute.patientName}</dd>
        </div>
        <div>
          <dt>Blocked in escrow</dt>
          <dd className={styles.amount}>{formatDisputeAmount(dispute.amountStroops, dispute.asset)}</dd>
        </div>
      </dl>

      <div className={styles.cardActions}>
        <Link to={href}>Review dispute</Link>
      </div>
    </article>
  );
}
