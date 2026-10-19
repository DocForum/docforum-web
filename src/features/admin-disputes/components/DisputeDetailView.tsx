import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/Button';
import { Spinner } from '../../../components/Spinner';
import { formatStroops } from '../../../services/payments-service';
import { useDispute } from '../hooks/useDisputes';
import { describeDetailError } from '../errors';
import {
  RESOLUTION_LABELS,
  STATUS_LABELS,
  ageTone,
  formatAge,
  hoursSince,
  paymentConsequence,
} from '../queue';
import { AttachmentList } from './AttachmentList';
import { DisputeTimeline } from './DisputeTimeline';
import { ResolveDisputeDialog } from './ResolveDisputeDialog';
import type { DisputeResolution } from '../../../types/models';
import styles from './Disputes.module.css';

const TONE_CLASS = {
  elevated: styles.ageElevated,
  high: styles.ageHigh,
  critical: styles.ageCritical,
};

interface Notice {
  tone: 'success' | 'warning';
  message: string;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/**
 * One dispute, in the order an admin needs it: what the patient reported,
 * what the facility says and attached, what has happened since, then the two
 * final ways to resolve it. The payment consequence is repeated in the
 * confirmation dialog before anything is sent.
 */
export function DisputeDetailView({ disputeId }: { disputeId: string }) {
  const titleId = useId();
  const disputeQuery = useDispute(disputeId);
  const [resolution, setResolution] = useState<DisputeResolution | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  if (disputeQuery.isLoading) {
    return (
      <section className={styles.console}>
        <div className={styles.status} role="status">
          <Spinner size={20} />
          <span>Loading dispute…</span>
        </div>
      </section>
    );
  }

  if (disputeQuery.error || !disputeQuery.data) {
    return (
      <section className={styles.console}>
        <Link to="/admin/disputes" className={styles.backLink}>
          ← Back to open disputes
        </Link>
        <div className={styles.errorBox} role="alert">
          <p>{describeDetailError(disputeQuery.error)}</p>
          <div className={styles.inlineActions}>
            <Button variant="secondary" onClick={() => void disputeQuery.refetch()}>
              Try again
            </Button>
            <Link to="/admin/disputes">Return to the queue</Link>
          </div>
        </div>
      </section>
    );
  }

  const dispute = disputeQuery.data;
  const hours = hoursSince(dispute.openedAt, disputeQuery.dataUpdatedAt || Date.now());
  const amount = formatStroops(dispute.amountStroops, dispute.asset);
  const isOpen = dispute.status === 'open';
  const resolvedConsequence = dispute.resolution
    ? paymentConsequence(dispute, dispute.resolution)
    : null;

  return (
    <section className={styles.console} aria-labelledby={titleId}>
      <Link to="/admin/disputes" className={styles.backLink}>
        ← Back to open disputes
      </Link>

      <header className={styles.detailHeader}>
        <div className={styles.badges}>
          <span className={styles.statusBadge} data-status={dispute.status}>
            {STATUS_LABELS[dispute.status]}
          </span>
          {hours !== null && isOpen && (
            <span className={`${styles.age} ${TONE_CLASS[ageTone(hours)]}`}>
              Open {formatAge(hours)}
            </span>
          )}
          <span className={styles.orderType}>
            {dispute.orderType === 'prescription' ? 'Prescription' : 'Lab order'}
          </span>
        </div>
        <h1 id={titleId} className={styles.detailTitle}>
          {dispute.orderItemName}
        </h1>
        <p className={styles.subtitle}>
          {dispute.facilityName} · order <code className={styles.orderId}>{dispute.orderId}</code> · opened{' '}
          <time dateTime={dispute.openedAt}>{formatDateTime(dispute.openedAt)}</time>
        </p>
      </header>

      {notice && (
        <div
          className={notice.tone === 'success' ? styles.noticeSuccess : styles.noticeWarning}
          role="status"
        >
          <p>{notice.message}</p>
          <button
            type="button"
            className={styles.dismiss}
            onClick={() => setNotice(null)}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      <dl className={styles.summaryGrid}>
        <div>
          <dt>Patient</dt>
          <dd>{dispute.patientName}</dd>
        </div>
        <div>
          <dt>Facility</dt>
          <dd>{dispute.facilityName}</dd>
        </div>
        <div>
          <dt>Amount in escrow</dt>
          <dd className={styles.amount}>{amount}</dd>
        </div>
        <div>
          <dt>Payment intent</dt>
          <dd>
            {dispute.paymentIntentId ? (
              <code className={styles.orderId}>{dispute.paymentIntentId}</code>
            ) : (
              'Not linked'
            )}
          </dd>
        </div>
      </dl>

      {isOpen ? (
        <div className={styles.holdNotice} role="status">
          <strong>Payment release is blocked</strong>
          <p>
            {amount} stays in escrow until this dispute is resolved. Resolving releases it to the
            facility or refunds it to the patient — there is no third outcome.
          </p>
        </div>
      ) : (
        <div className={styles.resolvedNotice} role="status">
          <strong>{STATUS_LABELS[dispute.status]}</strong>
          <p>
            {resolvedConsequence?.summary}. Resolved by {dispute.resolvedBy ?? 'an admin'} on{' '}
            {formatDateTime(dispute.resolvedAt)}. This is final.
          </p>
          {dispute.resolutionNote && (
            <p className={styles.resolutionNote}>
              <span className={styles.fieldLabel}>Resolution note</span> {dispute.resolutionNote}
            </p>
          )}
        </div>
      )}

      <article className={styles.panel} aria-labelledby={`${titleId}-report`}>
        <h2 id={`${titleId}-report`} className={styles.panelTitle}>
          Patient report
        </h2>
        <blockquote className={styles.report}>
          <p>{dispute.patientReport}</p>
          <cite>{dispute.patientName}</cite>
        </blockquote>
      </article>

      <article className={styles.panel} aria-labelledby={`${titleId}-proof`}>
        <h2 id={`${titleId}-proof`} className={styles.panelTitle}>
          Facility proof
        </h2>
        {dispute.facilityProof ? (
          <blockquote className={styles.proof}>
            <p>{dispute.facilityProof}</p>
            <cite>{dispute.facilityName}</cite>
          </blockquote>
        ) : (
          <p className={styles.inlineEmpty}>
            The facility hasn&apos;t given a written response yet. Attachments, if any, are below.
          </p>
        )}
        <AttachmentList disputeId={dispute.id} attachments={dispute.attachments} />
      </article>

      <article className={styles.panel} aria-labelledby={`${titleId}-timeline`}>
        <h2 id={`${titleId}-timeline`} className={styles.panelTitle}>
          Timeline
        </h2>
        <DisputeTimeline entries={dispute.timeline} />
      </article>

      {isOpen && (
        <article className={styles.panel} aria-labelledby={`${titleId}-resolve`}>
          <h2 id={`${titleId}-resolve`} className={styles.panelTitle}>
            Resolve this dispute
          </h2>
          <p className={styles.panelHint}>
            Both actions are final. You&apos;ll see the exact payment consequence, and must add a
            note and confirm, before either is sent.
          </p>
          <div className={styles.resolveActions}>
            <div className={styles.resolveChoice}>
              <span className={styles.resolveChoiceTitle}>
                {paymentConsequence(dispute, 'facility').headline}
              </span>
              <p>{paymentConsequence(dispute, 'facility').detail}</p>
              <Button type="button" onClick={() => setResolution('facility')}>
                Resolve for facility
              </Button>
            </div>
            <div className={styles.resolveChoice}>
              <span className={styles.resolveChoiceTitle}>
                {paymentConsequence(dispute, 'patient').headline}
              </span>
              <p>{paymentConsequence(dispute, 'patient').detail}</p>
              <Button type="button" variant="danger" onClick={() => setResolution('patient')}>
                Resolve for patient
              </Button>
            </div>
          </div>
        </article>
      )}

      {resolution && (
        <ResolveDisputeDialog
          dispute={dispute}
          resolution={resolution}
          onClose={() => setResolution(null)}
          onResolved={() => {
            const consequence = paymentConsequence(dispute, resolution);
            setResolution(null);
            setNotice({
              tone: 'success',
              message: `${RESOLUTION_LABELS[resolution]}. ${consequence.summary}. This is final.`,
            });
          }}
          onConflict={(message) => {
            setResolution(null);
            setNotice({ tone: 'warning', message });
          }}
        />
      )}
    </section>
  );
}
