import { Link } from 'react-router-dom';
import { formatStroops } from '../../../services/payments-service';
import { ageTone, formatAge, hoursSince } from '../queue';
import type { FulfillmentDisputeSummary } from '../../../types/models';
import styles from './Disputes.module.css';

const TONE_CLASS = {
  elevated: styles.ageElevated,
  high: styles.ageHigh,
  critical: styles.ageCritical,
};

const ORDER_TYPE_LABELS: Record<FulfillmentDisputeSummary['orderType'], string> = {
  prescription: 'Prescription',
  lab: 'Lab order',
};

interface DisputeCardProps {
  dispute: FulfillmentDisputeSummary;
  now: number;
}

export function DisputeCard({ dispute, now }: DisputeCardProps) {
  const hours = hoursSince(dispute.openedAt, now);
  const headingId = `dispute-${dispute.id}`;
  const amount = formatStroops(dispute.amountStroops, dispute.asset);

  return (
    <article className={styles.card} aria-labelledby={headingId}>
      <div className={styles.cardTop}>
        <div className={styles.badges}>
          {hours !== null && (
            <span className={`${styles.age} ${TONE_CLASS[ageTone(hours)]}`}>Open {formatAge(hours)}</span>
          )}
          <span className={styles.orderType}>{ORDER_TYPE_LABELS[dispute.orderType]}</span>
        </div>
        <code className={styles.disputeId} title="Dispute id">
          {dispute.id}
        </code>
      </div>

      <h2 id={headingId} className={styles.cardTitle}>
        <Link to={`/admin/disputes/${encodeURIComponent(dispute.id)}`}>{dispute.orderItemName}</Link>
      </h2>

      <dl className={styles.facts}>
        <div>
          <dt>Facility</dt>
          <dd>{dispute.facilityName}</dd>
        </div>
        <div>
          <dt>Amount in escrow</dt>
          <dd className={styles.amount}>{amount}</dd>
        </div>
        <div>
          <dt>Patient</dt>
          <dd>{dispute.patientName}</dd>
        </div>
        <div>
          <dt>Order</dt>
          <dd>
            <code className={styles.orderId}>{dispute.orderId}</code>
          </dd>
        </div>
      </dl>

      <blockquote className={styles.excerpt}>
        <p>{dispute.reportExcerpt}</p>
        <cite>Patient report</cite>
      </blockquote>

      <div className={styles.cardFooter}>
        <span className={styles.attachmentCount}>
          {dispute.attachmentCount === 0
            ? 'No attachments'
            : `${dispute.attachmentCount} ${dispute.attachmentCount === 1 ? 'attachment' : 'attachments'}`}
        </span>
        <Link className={styles.reviewLink} to={`/admin/disputes/${encodeURIComponent(dispute.id)}`}>
          Review dispute<span aria-hidden="true"> →</span>
        </Link>
      </div>
    </article>
  );
}
