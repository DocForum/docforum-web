import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/Button';
import { Spinner } from '../../../components/Spinner';
import { statusLabel, orderTypeLabel } from '../../payments/status';
import { formatStroops } from '../../../services/payments-service';
import { useDispute } from '../hooks/useDisputes';
import { describeDisputeDetailError } from '../errors';
import { ageTone, hoursSince, reasonLabel } from '../queue';
import { ageLabel, formatDateTime } from '../format';
import { resolutionConsequence, resolutionLabel } from '../resolution';
import { AttachmentList } from './AttachmentList';
import { ResolutionDialog } from './ResolutionDialog';
import type { DisputeResolution, DisputeTimelineEvent, FulfillmentDispute } from '../../../types/models';
import styles from './Disputes.module.css';

const TONE_CLASS = {
  elevated: styles.ageElevated,
  high: styles.ageHigh,
  critical: styles.ageCritical,
} as const;

function actorRoleLabel(event: DisputeTimelineEvent): string {
  if (event.actorRole === 'system') return 'System';
  return event.actorRole.charAt(0).toUpperCase() + event.actorRole.slice(1);
}

function Timeline({ events }: { events: DisputeTimelineEvent[] }) {
  if (events.length === 0) return <p className={styles.muted}>No timeline events recorded.</p>;
  return (
    <ol className={styles.timeline}>
      {events.map((event) => (
        <li className={styles.timelineItem} data-kind={event.kind} key={event.id}>
          <span className={styles.timelineTime}>
            <time dateTime={event.at}>{formatDateTime(event.at)}</time> · {actorRoleLabel(event)} · {event.actorName}
          </span>
          <p className={styles.timelineSummary}>{event.summary}</p>
        </li>
      ))}
    </ol>
  );
}

/** What actually happened to the money, read from the post-resolution payment
 * status rather than assuming the release/refund succeeded. */
function resolvedPaymentCopy(dispute: FulfillmentDispute, resolution: DisputeResolution): string {
  const amount = formatStroops(dispute.amountStroops, dispute.asset);
  if (resolution === 'facility') {
    return dispute.payment.status === 'released'
      ? `${amount} was released from escrow to ${dispute.facility.name}.`
      : `The dispute was decided for the facility; the payment is currently "${statusLabel(dispute.payment.status)}".`;
  }
  return dispute.payment.status === 'refunded'
    ? `${amount} was refunded from escrow to ${dispute.patientName}.`
    : `The dispute was decided for the patient; the payment is currently "${statusLabel(dispute.payment.status)}".`;
}

function ResolvedNotice({ dispute }: { dispute: FulfillmentDispute }) {
  if (!dispute.resolution) return null;
  const party = resolutionLabel(dispute.resolution);
  return (
    <section className={styles.resolved} aria-labelledby="dispute-resolved-heading">
      <h2 id="dispute-resolved-heading">Resolved for the {party}</h2>
      <p>{resolvedPaymentCopy(dispute, dispute.resolution)}</p>
      <p className={styles.muted}>
        {dispute.resolvedBy ? `Resolved by ${dispute.resolvedBy}` : 'Resolved'}
        {dispute.resolvedAt ? ` on ${formatDateTime(dispute.resolvedAt)}` : ''}. This decision is final.
      </p>
      {dispute.resolutionNotes && (
        <p>
          <strong>Resolution notes:</strong> {dispute.resolutionNotes}
        </p>
      )}
    </section>
  );
}

function ActionChoice({
  dispute,
  resolution,
  onChoose,
}: {
  dispute: FulfillmentDispute;
  resolution: DisputeResolution;
  onChoose: () => void;
}) {
  const consequence = resolutionConsequence(dispute, resolution);
  return (
    <div className={styles.panelBlock}>
      <Button variant={resolution === 'patient' ? 'danger' : 'primary'} onClick={onChoose}>
        Resolve for {resolutionLabel(resolution)}
      </Button>
      <p className={styles.muted}>{consequence.payment}</p>
      <p className={styles.muted}>{consequence.outcome}</p>
    </div>
  );
}

export function DisputeDetail({ disputeId }: { disputeId: string }) {
  const query = useDispute(disputeId);
  const [resolution, setResolution] = useState<DisputeResolution | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [staleNotice, setStaleNotice] = useState<string | null>(null);

  if (query.isPending) {
    return (
      <p className={styles.status}>
        <Spinner />
        Loading dispute…
      </p>
    );
  }

  if (query.isError && !query.data) {
    return (
      <div className={styles.detail}>
        <Link to="/admin/disputes" className={styles.backLink}>
          ← All disputes
        </Link>
        <div className={styles.errorBox} role="alert">
          <p>{describeDisputeDetailError(query.error)}</p>
          <Button variant="secondary" onClick={() => void query.refetch()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  const dispute = query.data;
  if (!dispute) {
    return (
      <div className={styles.detail}>
        <Link to="/admin/disputes" className={styles.backLink}>
          ← All disputes
        </Link>
        <p className={styles.empty}>This dispute no longer exists.</p>
      </div>
    );
  }

  const now = Date.now();
  const hours = hoursSince(dispute.openedAt, now);
  const isOpen = dispute.status === 'open';
  const amount = formatStroops(dispute.amountStroops, dispute.asset);
  const facilityConsequence = resolutionConsequence(dispute, 'facility');
  const patientConsequence = resolutionConsequence(dispute, 'patient');

  return (
    <div className={styles.detail}>
      <Link to="/admin/disputes" className={styles.backLink}>
        ← All disputes
      </Link>

      {notice && (
        <div className={styles.noticeSuccess} role="status">
          <p>{notice}</p>
          <button type="button" className={styles.dismiss} onClick={() => setNotice(null)} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}
      {staleNotice && (
        <div className={styles.noticeWarning} role="alert">
          <p>{staleNotice}</p>
          <button type="button" className={styles.dismiss} onClick={() => setStaleNotice(null)} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      <header className={styles.detailHeader}>
        <div className={styles.badges}>
          <span className={isOpen ? styles.statusOpen : styles.statusResolved}>
            {isOpen ? 'Open' : `Resolved for the ${resolutionLabel(dispute.resolution ?? 'patient')}`}
          </span>
          <span className={styles.reason}>{reasonLabel(dispute.reason)}</span>
          {isOpen && (
            <span className={[styles.age, TONE_CLASS[ageTone(hours ?? 0)]].join(' ')}>
              Open {ageLabel(dispute.openedAt, now)}
            </span>
          )}
        </div>
        <h1 className={styles.detailTitle}>{dispute.itemName}</h1>
        <p className={styles.detailMeta}>
          {orderTypeLabel(dispute.orderType)} order <code>{dispute.orderId}</code> · {dispute.facility.name} · opened{' '}
          {formatDateTime(dispute.openedAt)}
        </p>
      </header>

      {dispute.status === 'open' ? (
        <div className={styles.noticeWarning} role="status">
          <p>
            <strong>Payment release is blocked.</strong> {amount} is held in escrow until this dispute is resolved.
          </p>
        </div>
      ) : (
        <ResolvedNotice dispute={dispute} />
      )}

      <div className={styles.detailGrid}>
        <section className={styles.panel} aria-labelledby="dispute-payment-heading">
          <h2 className={styles.panelTitle} id="dispute-payment-heading">
            Payment
          </h2>
          <dl className={styles.facts}>
            <div>
              <dt>Blocked amount</dt>
              <dd className={styles.amount}>{amount}</dd>
            </div>
            <div>
              <dt>Escrow status</dt>
              <dd>{statusLabel(dispute.payment.status)}</dd>
            </div>
            <div>
              <dt>Payment intent</dt>
              <dd>
                <Link className={styles.mono} to={`/admin?intent=${encodeURIComponent(dispute.payment.intentId)}`}>
                  {dispute.payment.intentId}
                </Link>
              </dd>
            </div>
            {dispute.payment.escrowId && (
              <div>
                <dt>Escrow id</dt>
                <dd className={styles.mono}>{dispute.payment.escrowId}</dd>
              </div>
            )}
          </dl>
        </section>

        <section className={styles.panel} aria-labelledby="dispute-report-heading">
          <h2 className={styles.panelTitle} id="dispute-report-heading">
            Patient report
          </h2>
          <p className={styles.fieldHint}>
            {reasonLabel(dispute.patientReport.reason)} · submitted {formatDateTime(dispute.patientReport.submittedAt)}{' '}
            by {dispute.patientReport.submittedBy}
          </p>
          <p className={styles.reportText}>{dispute.patientReport.description}</p>
        </section>

        <section className={styles.panel} aria-labelledby="dispute-proof-heading">
          <h2 className={styles.panelTitle} id="dispute-proof-heading">
            Facility proof
          </h2>
          {dispute.facilityProof ? (
            <>
              <p>
                <span className={styles.panelLabel}>Reference</span>{' '}
                <span className={styles.proofReference}>{dispute.facilityProof.reference}</span>
              </p>
              <p className={styles.fieldHint}>
                Submitted {formatDateTime(dispute.facilityProof.submittedAt)} by {dispute.facilityProof.submittedBy}
              </p>
              {dispute.facilityProof.note ? (
                <p>{dispute.facilityProof.note}</p>
              ) : (
                <p className={styles.muted}>No note was added.</p>
              )}
              <div className={styles.panelBlock}>
                <h3 className={styles.panelLabel}>Attachments</h3>
                <AttachmentList disputeId={dispute.id} attachments={dispute.facilityProof.attachments} />
              </div>
            </>
          ) : (
            <p className={styles.danger}>
              The facility has not submitted proof yet. Without proof, resolving for the facility means releasing money
              on the patient's word alone.
            </p>
          )}
        </section>
      </div>

      <section className={styles.panel} aria-labelledby="dispute-timeline-heading">
        <h2 className={styles.panelTitle} id="dispute-timeline-heading">
          Timeline
        </h2>
        <Timeline events={dispute.timeline} />
      </section>

      {isOpen && (
        <section className={styles.panel} aria-labelledby="dispute-resolve-heading">
          <h2 className={styles.panelTitle} id="dispute-resolve-heading">
            Resolve this dispute
          </h2>
          <p className={styles.finalWarning}>
            Both choices are final. Resolving releases or refunds the escrow — it cannot be reversed or re-opened.
          </p>
          <div className={styles.resolveActions}>
            <ActionChoice dispute={dispute} resolution="facility" onChoose={() => setResolution('facility')} />
            <ActionChoice dispute={dispute} resolution="patient" onChoose={() => setResolution('patient')} />
          </div>
          {(facilityConsequence.movesMoney || patientConsequence.movesMoney) && (
            <p className={styles.fieldHint}>
              The exact payment consequence is shown again in the confirmation step before anything moves.
            </p>
          )}
        </section>
      )}

      {resolution && (
        <ResolutionDialog
          dispute={dispute}
          resolution={resolution}
          onClose={() => {
            setResolution(null);
            void query.refetch();
          }}
          onResolved={(updated) => {
            setResolution(null);
            setNotice(
              `Dispute resolved for the ${resolutionLabel(updated.resolution ?? resolution)}. ` +
                `The decision is final and was written to the audit trail.`,
            );
          }}
          onStale={(message) => {
            // The mutation hook already invalidates a conflicted detail (and
            // the open queue); refetching here would fetch the same page twice.
            setResolution(null);
            setStaleNotice(message);
          }}
        />
      )}
    </div>
  );
}
