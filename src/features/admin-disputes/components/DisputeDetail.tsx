import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/Button';
import { Spinner } from '../../../components/Spinner';
import { statusLabel, orderTypeLabel } from '../../payments/status';
import { formatStroops } from '../../../services/payments-service';
import { useDispute } from '../hooks/useDisputes';
import { describeDisputeDetailError } from '../errors';
import { ageTone, hoursSince, reasonLabel } from '../queue';
import { ageLabel } from '../format';
import { resolutionConsequence, resolutionLabel } from '../resolution';
import { AttachmentList } from './AttachmentList';
import { ResolutionDialog } from './ResolutionDialog';
import type { DisputeResolution, DisputeTimelineEvent, FulfillmentDispute } from '../../../types/models';
import { useFormatters } from '../../../i18n/formatters';
import { useT } from '../../../i18n/useT';
import styles from './Disputes.module.css';

const TONE_CLASS = {
  elevated: styles.ageElevated,
  high: styles.ageHigh,
  critical: styles.ageCritical,
} as const;

function actorRoleLabel(event: DisputeTimelineEvent, t: ReturnType<typeof useT>): string {
  if (event.actorRole === 'system') return t('adminAudit.system', 'System');
  return t(`roles.${event.actorRole}`, event.actorRole);
}

function Timeline({ events }: { events: DisputeTimelineEvent[] }) {
  const t = useT();
  const { dateTime } = useFormatters();
  if (events.length === 0) return <p className={styles.muted}>{t('adminDisputes.timeline.empty', 'No timeline events recorded.')}</p>;
  return (
    <ol className={styles.timeline}>
      {events.map((event) => (
        <li className={styles.timelineItem} data-kind={event.kind} key={event.id}>
          <span className={styles.timelineTime}>
            <time dateTime={event.at}>{dateTime(event.at)}</time> · {actorRoleLabel(event, t)} · {event.actorName}
          </span>
          <p className={styles.timelineSummary}>{event.summary}</p>
        </li>
      ))}
    </ol>
  );
}

/** What actually happened to the money, read from the post-resolution payment
 * status rather than assuming the release/refund succeeded. */
function resolvedPaymentCopy(dispute: FulfillmentDispute, resolution: DisputeResolution, t: ReturnType<typeof useT>): string {
  const amount = formatStroops(dispute.amountStroops, dispute.asset);
  if (resolution === 'facility') {
    return dispute.payment.status === 'released'
      ? t('adminDisputes.resolved.released', '{amount} was released from escrow to {facility}.', { amount, facility: dispute.facility.name })
      : t('adminDisputes.resolved.statusFacility', 'The dispute was decided for the facility; the payment is currently “{status}”.', { status: statusLabel(dispute.payment.status, t) });
  }
  return dispute.payment.status === 'refunded'
    ? t('adminDisputes.resolved.refunded', '{amount} was refunded from escrow to {patient}.', { amount, patient: dispute.patientName })
    : t('adminDisputes.resolved.statusPatient', 'The dispute was decided for the patient; the payment is currently “{status}”.', { status: statusLabel(dispute.payment.status, t) });
}

function ResolvedNotice({ dispute }: { dispute: FulfillmentDispute }) {
  const t = useT();
  const { dateTime } = useFormatters();
  if (!dispute.resolution) return null;
  const party = resolutionLabel(dispute.resolution, t);
  return (
    <section className={styles.resolved} aria-labelledby="dispute-resolved-heading">
      <h2 id="dispute-resolved-heading">{t('adminDisputes.resolved.heading', 'Resolved for the {party}', { party })}</h2>
      <p>{resolvedPaymentCopy(dispute, dispute.resolution, t)}</p>
      <p className={styles.muted}>
        {dispute.resolvedBy
          ? t('adminDisputes.resolved.by', 'Resolved by {name}', { name: dispute.resolvedBy })
          : t('adminDisputes.resolved.done', 'Resolved')}
        {dispute.resolvedAt ? t('adminDisputes.resolved.on', ' on {date}', { date: dateTime(dispute.resolvedAt) }) : ''}.{' '}
        {t('adminDisputes.resolved.final', 'This decision is final.')}
      </p>
      {dispute.resolutionNotes && (
        <p>
          <strong>{t('adminDisputes.resolved.notes', 'Resolution notes:')}</strong> {dispute.resolutionNotes}
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
  const t = useT();
  const consequence = resolutionConsequence(dispute, resolution, t);
  return (
    <div className={styles.panelBlock}>
      <Button variant={resolution === 'patient' ? 'danger' : 'primary'} onClick={onChoose}>
        {t('adminDisputes.resolveFor', 'Resolve for {party}', { party: resolutionLabel(resolution, t) })}
      </Button>
      <p className={styles.muted}>{consequence.payment}</p>
      <p className={styles.muted}>{consequence.outcome}</p>
    </div>
  );
}

export function DisputeDetail({ disputeId }: { disputeId: string }) {
  const t = useT();
  const { dateTime } = useFormatters();
  const query = useDispute(disputeId);
  const [resolution, setResolution] = useState<DisputeResolution | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [staleNotice, setStaleNotice] = useState<string | null>(null);

  if (query.isPending) {
    return (
      <p className={styles.status}>
        <Spinner />
        {t('adminDisputes.detail.loading', 'Loading dispute…')}
      </p>
    );
  }

  if (query.isError && !query.data) {
    return (
      <div className={styles.detail}>
        <Link to="/admin/disputes" className={styles.backLink}>
          {t('adminDisputes.detail.back', '← All disputes')}
        </Link>
        <div className={styles.errorBox} role="alert">
          <p>{describeDisputeDetailError(query.error, t)}</p>
          <Button variant="secondary" onClick={() => void query.refetch()}>
            {t('common.tryAgain', 'Try again')}
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
          {t('adminDisputes.detail.back', '← All disputes')}
        </Link>
        <p className={styles.empty}>{t('adminDisputes.detail.notFound', 'This dispute no longer exists.')}</p>
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
        {t('adminDisputes.detail.back', '← All disputes')}
      </Link>

      {notice && (
        <div className={styles.noticeSuccess} role="status">
          <p>{notice}</p>
          <button type="button" className={styles.dismiss} onClick={() => setNotice(null)} aria-label={t('common.dismiss', 'Dismiss')}>
            ×
          </button>
        </div>
      )}
      {staleNotice && (
        <div className={styles.noticeWarning} role="alert">
          <p>{staleNotice}</p>
          <button type="button" className={styles.dismiss} onClick={() => setStaleNotice(null)} aria-label={t('common.dismiss', 'Dismiss')}>
            ×
          </button>
        </div>
      )}

      <header className={styles.detailHeader}>
        <div className={styles.badges}>
          <span className={isOpen ? styles.statusOpen : styles.statusResolved}>
            {isOpen
              ? t('adminDisputes.status.open', 'Open')
              : t('adminDisputes.resolved.heading', 'Resolved for the {party}', {
                  party: resolutionLabel(dispute.resolution ?? 'patient', t),
                })}
          </span>
          <span className={styles.reason}>{reasonLabel(dispute.reason, t)}</span>
          {isOpen && (
            <span className={[styles.age, TONE_CLASS[ageTone(hours ?? 0)]].join(' ')}>
              {t('adminDisputes.openAge', 'Open {age}', { age: ageLabel(dispute.openedAt, now, t) })}
            </span>
          )}
        </div>
        <h1 className={styles.detailTitle}>{dispute.itemName}</h1>
        <p className={styles.detailMeta}>
          {t('adminDisputes.detail.meta', '{type} order {id} · {facility} · opened {date}', {
            type: orderTypeLabel(dispute.orderType, t),
            id: dispute.orderId,
            facility: dispute.facility.name,
            date: dateTime(dispute.openedAt),
          })}
        </p>
      </header>

      {dispute.status === 'open' ? (
        <div className={styles.noticeWarning} role="status">
          <p>
            <strong>{t('adminDisputes.paymentBlocked', 'Payment release is blocked.')}</strong>{' '}
            {t('adminDisputes.paymentHeld', '{amount} is held in escrow until this dispute is resolved.', { amount })}
          </p>
        </div>
      ) : (
        <ResolvedNotice dispute={dispute} />
      )}

      <div className={styles.detailGrid}>
        <section className={styles.panel} aria-labelledby="dispute-payment-heading">
          <h2 className={styles.panelTitle} id="dispute-payment-heading">
            {t('adminDisputes.payment', 'Payment')}
          </h2>
          <dl className={styles.facts}>
            <div>
              <dt>{t('adminDisputes.blockedAmount', 'Blocked amount')}</dt>
              <dd className={styles.amount}>{amount}</dd>
            </div>
            <div>
              <dt>{t('adminDisputes.escrowStatus', 'Escrow status')}</dt>
              <dd>{statusLabel(dispute.payment.status, t)}</dd>
            </div>
            <div>
              <dt>{t('adminDisputes.paymentIntent', 'Payment intent')}</dt>
              <dd>
                <Link className={styles.mono} to={`/admin/payments/console?intent=${encodeURIComponent(dispute.payment.intentId)}`}>
                  {dispute.payment.intentId}
                </Link>
              </dd>
            </div>
            {dispute.payment.escrowId && (
              <div>
                <dt>{t('adminDisputes.escrowId', 'Escrow id')}</dt>
                <dd className={styles.mono}>{dispute.payment.escrowId}</dd>
              </div>
            )}
          </dl>
        </section>

        <section className={styles.panel} aria-labelledby="dispute-report-heading">
          <h2 className={styles.panelTitle} id="dispute-report-heading">
            {t('adminDisputes.patientReport', 'Patient report')}
          </h2>
          <p className={styles.fieldHint}>
            {t('adminDisputes.reportMeta', '{reason} · submitted {date} by {name}', {
              reason: reasonLabel(dispute.patientReport.reason, t),
              date: dateTime(dispute.patientReport.submittedAt),
              name: dispute.patientReport.submittedBy,
            })}
          </p>
          <p className={styles.reportText}>{dispute.patientReport.description}</p>
        </section>

        <section className={styles.panel} aria-labelledby="dispute-proof-heading">
          <h2 className={styles.panelTitle} id="dispute-proof-heading">
            {t('adminDisputes.facilityProof', 'Facility proof')}
          </h2>
          {dispute.facilityProof ? (
            <>
              <p>
                <span className={styles.panelLabel}>{t('adminDisputes.reference', 'Reference')}</span>{' '}
                <span className={styles.proofReference}>{dispute.facilityProof.reference}</span>
              </p>
              <p className={styles.fieldHint}>
                {t('adminDisputes.proofMeta', 'Submitted {date} by {name}', {
                  date: dateTime(dispute.facilityProof.submittedAt),
                  name: dispute.facilityProof.submittedBy,
                })}
              </p>
              {dispute.facilityProof.note ? (
                <p>{dispute.facilityProof.note}</p>
              ) : (
                <p className={styles.muted}>{t('adminDisputes.noNote', 'No note was added.')}</p>
              )}
              <div className={styles.panelBlock}>
                <h3 className={styles.panelLabel}>{t('adminDisputes.attachments', 'Attachments')}</h3>
                <AttachmentList disputeId={dispute.id} attachments={dispute.facilityProof.attachments} />
              </div>
            </>
          ) : (
            <p className={styles.danger}>
              {t('adminDisputes.noFacilityProof', 'The facility has not submitted proof yet. Without proof, resolving for the facility means releasing money on the patient’s word alone.')}
            </p>
          )}
        </section>
      </div>

      <section className={styles.panel} aria-labelledby="dispute-timeline-heading">
        <h2 className={styles.panelTitle} id="dispute-timeline-heading">
          {t('adminDisputes.timeline.title', 'Timeline')}
        </h2>
        <Timeline events={dispute.timeline} />
      </section>

      {isOpen && (
        <section className={styles.panel} aria-labelledby="dispute-resolve-heading">
          <h2 className={styles.panelTitle} id="dispute-resolve-heading">
            {t('adminDisputes.resolveHeading', 'Resolve this dispute')}
          </h2>
          <p className={styles.finalWarning}>
            {t('adminDisputes.resolveWarning', 'Both choices are final. Resolving releases or refunds the escrow — it cannot be reversed or re-opened.')}
          </p>
          <div className={styles.resolveActions}>
            <ActionChoice dispute={dispute} resolution="facility" onChoose={() => setResolution('facility')} />
            <ActionChoice dispute={dispute} resolution="patient" onChoose={() => setResolution('patient')} />
          </div>
          {(facilityConsequence.movesMoney || patientConsequence.movesMoney) && (
            <p className={styles.fieldHint}>
              {t('adminDisputes.resolveExactWarning', 'The exact payment consequence is shown again in the confirmation step before anything moves.')}
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
              t('adminDisputes.resolved.success', 'Dispute resolved for the {party}. The decision is final and was written to the audit trail.', {
                party: resolutionLabel(updated.resolution ?? resolution, t),
              }),
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
